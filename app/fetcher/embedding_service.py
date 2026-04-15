"""
Embedding background service.
Encodes feed_items (title + content) into 384-dim vectors using
sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2 and stores them in the DB.
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
from functools import partial

from sentence_transformers import SentenceTransformer

import database
from config import settings

logger = logging.getLogger(__name__)

_BATCH_SIZE = 10

_model: SentenceTransformer | None = None


def _model_display_name() -> str:
    return f"sentence-transformers/{settings.embedding_model}"


def _get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        logger.info("embedding: loading model %s", _model_display_name())
        _model = SentenceTransformer(settings.embedding_model)
        logger.info("embedding: model loaded")
    return _model


def _encode(model: SentenceTransformer, texts: list[str]) -> list[list[float]]:
    """Synchronous encode — runs in executor to avoid blocking the event loop."""
    return model.encode(texts, show_progress_bar=False).tolist()


async def run_embedding_job() -> None:
    """
    Batch-embed up to _BATCH_SIZE unembedded feed_items.
    Called by APScheduler every embedding_coordinator_interval seconds.
    """
    start = time.monotonic()
    try:
        result = await _process_batch()
        duration_ms = int((time.monotonic() - start) * 1000)
        remaining = await database.count_unembedded_items()
        await database.insert_embedding_log(
            status=result["status"],
            items_fetched=result["items_fetched"],
            items_embedded=result["items_embedded"],
            items_skipped=result["items_skipped"],
            items_remaining_after=remaining,
            duration_ms=duration_ms,
            model_name=result["model_name"],
        )
    except Exception as exc:
        duration_ms = int((time.monotonic() - start) * 1000)
        logger.error("embedding job failed: %s", exc, exc_info=True)
        remaining = await database.count_unembedded_items()
        await database.insert_embedding_log(
            status="failed",
            items_remaining_after=remaining,
            duration_ms=duration_ms,
            error_message=str(exc)[:2000],
        )


async def _process_batch() -> dict:
    # Step 1: fetch up to 10 unembedded items (oldest first)
    items = await database.get_unembedded_items(_BATCH_SIZE)
    if not items:
        logger.debug("embedding: no unembedded items")
        return {"status": "skipped", "items_fetched": 0, "items_embedded": 0, "items_skipped": 0, "model_name": None}

    logger.info("embedding: processing %d item(s)", len(items))

    # Step 2: separate items that have neither title nor content → skip them
    to_skip = [row for row in items if not row["title"] and not row["content"]]
    to_embed = [row for row in items if row["title"] or row["content"]]

    if to_skip:
        skip_ids = [str(row["id"]) for row in to_skip]
        await database.mark_items_skipped(skip_ids)
        logger.info("embedding: skipped %d item(s) with no title/content", len(to_skip))

    if not to_embed:
        return {"status": "success", "items_fetched": len(items), "items_embedded": 0, "items_skipped": len(to_skip), "model_name": None}

    # Step 3: build input texts
    title_texts: list[str] = [row["title"] or "" for row in to_embed]
    content_texts: list[str] = [
        (row["title"] or "") + " " +
        (row["title"] or "") + " " +
        (row["content"] or "")[:500]
        for row in to_embed
    ]

    # Step 4: batch encode (run in executor — CPU-bound)
    model = _get_model()
    loop = asyncio.get_event_loop()
    title_vecs, content_vecs = await asyncio.gather(
        loop.run_in_executor(None, partial(_encode, model, title_texts)),
        loop.run_in_executor(None, partial(_encode, model, content_texts)),
    )

    # Step 5: write vectors to DB
    for row, title_vec, content_vec in zip(to_embed, title_vecs, content_vecs):
        await database.update_item_embeddings(
            item_id=str(row["id"]),
            embedding_title=json.dumps(title_vec),
            embedding_content=json.dumps(content_vec),
            model=_model_display_name(),
        )

    logger.info("embedding: wrote vectors for %d item(s)", len(to_embed))
    return {
        "status": "success",
        "items_fetched": len(items),
        "items_embedded": len(to_embed),
        "items_skipped": len(to_skip),
        "model_name": _model_display_name(),
    }
