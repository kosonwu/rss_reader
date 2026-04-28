"""
Core RSS fetch-and-parse logic.
One async function per feed; called by the scheduler coordinator.
"""

from __future__ import annotations

import asyncio
import logging
import math
import re
import time
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

import feedparser
import httpx
import trafilatura
from bs4 import BeautifulSoup

import database

logger = logging.getLogger(__name__)

# Shared async HTTP client (created once at module import; closed in main.py shutdown)
_http_client: httpx.AsyncClient | None = None


def get_http_client() -> httpx.AsyncClient:
    global _http_client
    if _http_client is None:
        _http_client = httpx.AsyncClient(
            timeout=30,
            follow_redirects=True,
            headers={"User-Agent": "rss-fetcher/0.1 (+https://github.com/kosonwu/rss-reader)"},
        )
    return _http_client


async def close_http_client() -> None:
    global _http_client
    if _http_client:
        await _http_client.aclose()
        _http_client = None


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def _calc_reading_time(content: str | None, title: str | None = None) -> int:
    """Mirrors the TypeScript calcReadingTime logic: CJK chars at 400/min, English words at 200/min."""
    text = content or title or ""
    chinese_chars = sum(1 for c in text if '\u4e00' <= c <= '\u9fff' or '\u3400' <= c <= '\u4dbf')
    without_chinese = re.sub(r'[\u4e00-\u9fff\u3400-\u4dbf]', ' ', text)
    english_words = len(without_chinese.split())
    minutes = chinese_chars / 400 + english_words / 200
    return max(1, math.ceil(minutes))


async def fetch_feed(feed_id: str, feed_url: str) -> None:
    """Fetch one RSS feed, upsert items, update feed row, write fetch_log."""
    start = time.monotonic()

    try:
        raw = await _download(feed_url)
        parsed = feedparser.parse(raw)

        if parsed.bozo and not parsed.entries:
            raise ValueError(f"feedparser error: {parsed.bozo_exception}")

        items = await asyncio.gather(*[_build_item(entry) for entry in parsed.entries])
        inserted = await database.upsert_feed_items(feed_id, list(items))
        await database.update_feed_success(feed_id)

        duration_ms = int((time.monotonic() - start) * 1000)
        await database.insert_fetch_log(
            feed_id=feed_id,
            status="success",
            article_count=inserted,
            duration_ms=duration_ms,
        )
        logger.info("feed=%s url=%s inserted=%d duration_ms=%d", feed_id, feed_url, inserted, duration_ms)

    except Exception as exc:
        duration_ms = int((time.monotonic() - start) * 1000)
        error_str = str(exc) or repr(exc)
        logger.warning("feed=%s url=%s error=%s", feed_id, feed_url, error_str)
        await database.update_feed_error(feed_id, error_str)
        await database.insert_fetch_log(
            feed_id=feed_id,
            status="failed",
            duration_ms=duration_ms,
            error_message=error_str,
        )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _download(url: str) -> bytes:
    client = get_http_client()
    response = await client.get(url)
    response.raise_for_status()
    return response.content


async def _build_item(entry: feedparser.FeedParserDict) -> dict:
    """Extract fields from a feedparser entry dict."""
    guid = entry.get("id") or entry.get("link") or entry.get("title", "")
    url = entry.get("link")

    # Parse published date
    published_at: datetime | None = None
    raw_date = entry.get("published") or entry.get("updated")
    if raw_date:
        try:
            published_at = parsedate_to_datetime(raw_date)
            if published_at.tzinfo is None:
                published_at = published_at.replace(tzinfo=timezone.utc)
        except Exception:
            published_at = None

    # Author
    author: str | None = None
    if entry.get("author"):
        author = entry["author"]
    elif entry.get("authors"):
        author = entry["authors"][0].get("name")

    description = entry.get("summary")

    # Try to extract image from RSS entry metadata (no HTTP request)
    rss_image_url = _extract_image_from_entry(entry)

    # --- 4-step content extraction pipeline ---
    content: str | None = None
    content_source: str = "summary_only"
    og_image_url: str | None = None

    # Step 1: RSS full content — use if any text present
    if entry.get("content"):
        raw = entry["content"][0].get("value") or ""
        plain = BeautifulSoup(raw, "html.parser").get_text(separator=" ", strip=True)
        if plain:
            content = plain
            content_source = "feed_full"

    # Fetch article page once — reused for OG image + trafilatura
    if url:
        page_og_image, page_html = await _fetch_article_page(url)
        # Page OG image takes priority; RSS entry image as fallback
        og_image_url = page_og_image or rss_image_url

        # Step 2: trafilatura extraction
        if content is None and page_html:
            extracted = trafilatura.extract(page_html, include_comments=False, include_tables=False)
            if extracted and len(extracted.strip()) >= 100:
                content = extracted.strip()
                content_source = "extracted"

        # Step 3: Jina Reader API — if content missing or too short
        if content is None or len(content) < 100:
            jina_content = await _fetch_jina(url)
            if jina_content:
                content = jina_content
                content_source = "jina"
    else:
        og_image_url = rss_image_url

    # Step 4: fallback to RSS description
    if content is None:
        plain_desc = BeautifulSoup(description or "", "html.parser").get_text(separator=" ", strip=True)
        content = plain_desc or None
        content_source = "summary_only"

    return {
        "guid": guid,
        "title": entry.get("title"),
        "description": description,
        "content": content,
        "content_source": content_source,
        "url": url,
        "author": author,
        "og_image_url": og_image_url,
        "published_at": published_at,
        "reading_time_minutes": _calc_reading_time(content, entry.get("title")),
    }


def _extract_image_from_entry(entry: feedparser.FeedParserDict) -> str | None:
    """Extract image URL from RSS entry metadata without any HTTP request."""
    for t in entry.get("media_thumbnail") or []:
        url = t.get("url", "")
        if url.startswith("http"):
            return url
    for m in entry.get("media_content") or []:
        url = m.get("url", "")
        if not url.startswith("http"):
            continue
        if m.get("medium") == "image" or "image" in m.get("type", ""):
            return url
    for enc in entry.get("enclosures") or []:
        url = enc.get("url", "")
        if url.startswith("http") and "image" in enc.get("type", ""):
            return url
    raw_desc = entry.get("summary") or ""
    if raw_desc:
        soup = BeautifulSoup(raw_desc, "html.parser")
        img = soup.find("img")
        if img:
            src = str(img.get("src") or img.get("data-src") or "")
            if src.startswith("http"):
                return src
    return None


_BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7",
}


async def _fetch_article_page(url: str) -> tuple[str | None, str | None]:
    """Fetch article page once; return (og_image_url, raw_html)."""
    try:
        client = get_http_client()
        response = await client.get(url, timeout=15, headers=_BROWSER_HEADERS)
        if response.status_code != 200:
            logger.debug("og_image fetch non-200 url=%s status=%d", url, response.status_code)
            return None, None
        html = response.text
        soup = BeautifulSoup(html, "html.parser")
        tag = (
            soup.find("meta", attrs={"property": "og:image"})
            or soup.find("meta", attrs={"name": "og:image"})
        )
        og_image_url = str(tag["content"]).strip() if tag and tag.get("content") else None
        return og_image_url, html
    except Exception as exc:
        logger.debug("og_image fetch failed url=%s error=%s", url, exc)
        return None, None


async def _fetch_jina(url: str) -> str | None:
    """Use Jina Reader (r.jina.ai) to extract plain-text article content."""
    try:
        client = get_http_client()
        response = await client.get(f"https://r.jina.ai/{url}", timeout=20)
        if response.status_code == 200 and response.text.strip():
            return response.text.strip()
    except Exception:
        pass
    return None
