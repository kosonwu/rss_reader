"""
Core RSS fetch-and-parse logic.
One async function per feed; called by the scheduler coordinator.
"""

from __future__ import annotations

import asyncio
import logging
import time
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

import feedparser
import httpx
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
        error_str = str(exc)
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

    # Content: prefer full content over summary
    content: str | None = None
    if entry.get("content"):
        content = entry["content"][0].get("value")
    description = entry.get("summary")

    # Author
    author: str | None = None
    if entry.get("author"):
        author = entry["author"]
    elif entry.get("authors"):
        author = entry["authors"][0].get("name")

    # OG image — try to fetch from article page
    og_image_url: str | None = None
    if url:
        og_image_url = await _fetch_og_image(url)

    return {
        "guid": guid,
        "title": entry.get("title"),
        "description": description,
        "content": content,
        "url": url,
        "author": author,
        "og_image_url": og_image_url,
        "published_at": published_at,
    }


async def _fetch_og_image(url: str) -> str | None:
    """Best-effort: fetch article page and extract og:image meta tag."""
    try:
        client = get_http_client()
        response = await client.get(url, timeout=10)
        if response.status_code != 200:
            return None
        soup = BeautifulSoup(response.text, "html.parser")
        tag = soup.find("meta", property="og:image") or soup.find("meta", attrs={"name": "og:image"})
        if tag and tag.get("content"):
            return str(tag["content"])
    except Exception:
        pass
    return None
