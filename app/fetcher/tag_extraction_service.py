"""
Tag extraction background service.
Uses KeyBERT with paraphrase-multilingual-MiniLM-L12-v2 to extract 5-8 topic tags
from feed_items content (Chinese or English).
"""

from __future__ import annotations

import asyncio
import logging
import re
import time
from functools import partial
from pathlib import Path

import numpy as np
from ckip_transformers.nlp import CkipWordSegmenter
from keybert import KeyBERT
from sklearn.feature_extraction.text import CountVectorizer
from keybert.backend._base import BaseEmbedder
from sentence_transformers.base.modality import is_audio_url_or_path

import database
import embedding_service
import ner_service
from config import settings
from text_utils import clean_token, preprocess

logger = logging.getLogger(__name__)
_BATCH_SIZE = 10
_TOP_N = 7

# Strip HTTP(S) URLs before passing text to KeyBERT — audio-file URLs (e.g. podcast
# .mp3 links) in RSS content trigger a modality-detection bug in sentence-transformers 5.x
# that misclassifies string candidates as 'audio' and raises ValueError.
_URL_RE = re.compile(r'https?://\S+')


_keybert: KeyBERT | None = None
_ckip_ws: CkipWordSegmenter | None = None

_STOPWORDS_DIR = Path(__file__).parent / "stopwords"


def _load_stop_words(filename: str) -> list[str]:
    """Load stop words from a text file, ignoring comment lines and blanks."""
    path = _STOPWORDS_DIR / filename
    if not path.exists():
        logger.warning("tag_extraction: stop words file not found: %s", path)
        return []
    words = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#"):
            words.append(line)
    return words


_STOP_WORDS_EN: list[str] = _load_stop_words("en.txt")
_STOP_WORDS_ZH_TW: list[str] = _load_stop_words("zh_tw.txt")


class _TextOnlyBackend(BaseEmbedder):
    """KeyBERT backend (inherits BaseEmbedder) that sanitises audio-URL strings before encoding.

    sentence-transformers 5.x classifies HTTP strings ending with audio extensions
    as 'audio' modality and raises ValueError when the model only supports text.
    We replace any such string with a neutral placeholder so encode() always receives
    safe text inputs. This is a safety net on top of URL-stripping in _process_batch.

    Must inherit BaseEmbedder so KeyBERT uses it directly rather than wrapping it
    in SentenceTransformerBackend (which bypasses our sanitisation).

    Reuses the singleton SentenceTransformer from embedding_service to avoid loading
    the model twice in memory.
    """

    def __init__(self) -> None:
        super().__init__()
        # Reuse the already-loaded model from embedding_service (lazy singleton).
        self.embedding_model = embedding_service._get_model()

    def embed(self, documents: list[str], verbose: bool = False) -> np.ndarray:
        safe = [
            " " if (isinstance(d, str) and is_audio_url_or_path(d)) else d
            for d in documents
        ]
        return self.embedding_model.encode(safe, show_progress_bar=verbose, convert_to_numpy=True)


def _get_keybert() -> KeyBERT:
    global _keybert
    if _keybert is None:
        logger.info("tag_extraction: initialising KeyBERT with model %s", embedding_service._model_display_name())
        _keybert = KeyBERT(model=_TextOnlyBackend())
        logger.info("tag_extraction: KeyBERT ready")
    return _keybert


def _get_ckip_ws() -> CkipWordSegmenter:
    global _ckip_ws
    if _ckip_ws is None:
        logger.info("tag_extraction: initialising CKIP word segmenter")
        _ckip_ws = CkipWordSegmenter(model=settings.ner_ckip_model)
        logger.info("tag_extraction: CKIP word segmenter ready")
    return _ckip_ws


def _extract_tags(kb: KeyBERT, text: str, language: str | None) -> list[tuple[str, float]]:
    """
    Synchronous KeyBERT extraction — runs in executor to avoid blocking the event loop.
    Returns up to _TOP_N (keyword, score) pairs, sorted by relevance descending.

    keyphrase_ngram_range:
      - zh-TW: (1, 1) — Chinese text has no word-boundary spaces, so bigrams via
        CountVectorizer produce nonsensical candidates; single tokens work better.
      - others: (1, 2) — allows meaningful two-word phrases (e.g. "machine learning").
    """
    if language == "zh-TW":
        ngram_range = (1, 1)
        stop_words = _STOP_WORDS_ZH_TW or None
    else:
        ngram_range = (1, 2)
        stop_words = _STOP_WORDS_EN or None
    # lowercase=False preserves original casing (e.g. "Apple" stays "Apple").
    # CountVectorizer defaults to lowercase=True, which would silently downcase all candidates.
    vectorizer = CountVectorizer(ngram_range=ngram_range, stop_words=stop_words, lowercase=False)
    return kb.extract_keywords(
        text,
        vectorizer=vectorizer,
        top_n=_TOP_N,
        use_mmr=True,       # Maximal Marginal Relevance for diversity
        diversity=0.5,
    )


async def run_tag_extraction_job() -> None:
    """
    Batch-extract tags for up to _BATCH_SIZE untagged feed_items.
    Called by APScheduler every tag_extraction_coordinator_interval seconds.
    """
    start = time.monotonic()
    try:
        result = await _process_batch()
        duration_ms = int((time.monotonic() - start) * 1000)
        remaining = await database.count_untagged_items()
        await database.insert_tag_extraction_log(
            status=result["status"],
            items_fetched=result["items_fetched"],
            items_tagged=result["items_tagged"],
            items_skipped=result["items_skipped"],
            items_remaining_after=remaining,
            duration_ms=duration_ms,
            model_name=result["model_name"],
        )
    except Exception as exc:
        duration_ms = int((time.monotonic() - start) * 1000)
        logger.error("tag extraction job failed: %s", exc, exc_info=True)
        remaining = await database.count_untagged_items()
        await database.insert_tag_extraction_log(
            status="failed",
            items_remaining_after=remaining,
            duration_ms=duration_ms,
            error_message=str(exc)[:2000],
        )
    finally:
        await ner_service._run_display_tags_pass()


async def _process_batch() -> dict:
    # Step 1: fetch untagged items (oldest first)
    items = await database.get_untagged_items(_BATCH_SIZE)
    if not items:
        logger.debug("tag_extraction: no untagged items")
        return {
            "status": "skipped",
            "items_fetched": 0,
            "items_tagged": 0,
            "items_skipped": 0,
            "model_name": None,
        }

    logger.info("tag_extraction: processing %d item(s)", len(items))

    # Step 2: separate items with no extractable text
    to_skip = [row for row in items if not row["title"] and not row["content"]]
    to_tag = [row for row in items if row["title"] or row["content"]]

    if to_skip:
        skip_ids = [str(row["id"]) for row in to_skip]
        await database.mark_items_tags_skipped(skip_ids)
        logger.info("tag_extraction: skipped %d item(s) with no title/content", len(to_skip))

    if not to_tag:
        return {
            "status": "success",
            "items_fetched": len(items),
            "items_tagged": 0,
            "items_skipped": len(to_skip),
            "model_name": None,
        }

    # Step 3: build input texts — title + content, capped at 2000 chars.
    # Strip HTTP URLs first: audio-file URLs in RSS content (e.g. podcast .mp3 links)
    # trigger a modality-detection bug in sentence-transformers 5.x.
    # For zh-TW feeds, run CKIP word segmentation so CountVectorizer can split on
    # spaces and produce meaningful single/multi-word candidates instead of treating
    # the whole unsegmented string as one token.
    def _build_texts_sync() -> list[str]:
        raw_texts = []
        for row in to_tag:
            raw = ((row["title"] or "") + " " + (row["content"] or ""))[:2000]
            raw = _URL_RE.sub(' ', raw).strip()
            raw = preprocess(raw)
            raw_texts.append(raw)

        zhtw_indices = [i for i, row in enumerate(to_tag) if row["language"] == "zh-TW"]
        if zhtw_indices:
            ws = _get_ckip_ws()
            zhtw_raws = [raw_texts[i] for i in zhtw_indices]
            ws_results = ws(zhtw_raws)
            for idx, ws_result in zip(zhtw_indices, ws_results):
                raw_texts[idx] = " ".join(ws_result)

        return raw_texts

    loop = asyncio.get_event_loop()
    texts = await loop.run_in_executor(None, _build_texts_sync)

    # Step 4: extract keywords per item (CPU-bound — run each in executor)
    kb = _get_keybert()
    results: list[list[tuple[str, float]]] = await asyncio.gather(*[
        loop.run_in_executor(None, partial(_extract_tags, kb, text, row["language"]))
        for text, row in zip(texts, to_tag)
    ])

    # Step 5: write tags to DB
    for row, keywords in zip(to_tag, results):
        # Clean edge punctuation, then drop single-character tags.
        cleaned = [((clean_token(kw), score)) for kw, score in keywords]
        cleaned = [(kw, score) for kw, score in cleaned if kw]
        tags = [kw for kw, _ in cleaned]
        scores = [round(float(score), 4) for _, score in cleaned]
        await database.update_item_tags(
            item_id=str(row["id"]),
            tags=tags,
            scores=scores,
            model=embedding_service._model_display_name(),
        )

    logger.info("tag_extraction: tagged %d item(s)", len(to_tag))
    return {
        "status": "success",
        "items_fetched": len(items),
        "items_tagged": len(to_tag),
        "items_skipped": len(to_skip),
        "model_name": embedding_service._model_display_name(),
    }
