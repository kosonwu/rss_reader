"""
User profile background service.

Computes per-user taste_vector (weighted average of bookmarked item embeddings)
and top_tags (weighted tag frequency) from user_bookmarks + feed_items.

No model calls — reads pre-computed embedding_content vectors from the DB.
Runs on APScheduler interval; logs to stdout only (no DB log table).
"""

from __future__ import annotations

import asyncio
import json
import logging
import math
import time
from datetime import datetime
from functools import partial

import numpy as np

import database

logger = logging.getLogger(__name__)

_BATCH_SIZE = 50  # max bookmarks per user to process (safety cap)


# ---------------------------------------------------------------------------
# Weight formula
# ---------------------------------------------------------------------------

def _retention_weight(removed_at: datetime | None, bookmarked_at: datetime) -> float:
    """
    Compute retention weight for a single bookmark based on how long the user kept it.

      removed_at IS NULL  → 1.0      (still active — strongest signal)
      removed within 24h  → 0.1      (transient / accidental bookmark)
      removed after N days → log(N+1) (natural log; proportional to retention duration)
    """
    if removed_at is None:
        return 1.0
    retention_seconds = (removed_at - bookmarked_at).total_seconds()
    if retention_seconds < 86400:           # < 24 hours
        return 0.1
    retention_days = retention_seconds / 86400.0
    return math.log(retention_days + 1)     # natural log


# ---------------------------------------------------------------------------
# CPU-bound computation (runs in executor)
# ---------------------------------------------------------------------------

def _compute_profile(rows: list[dict]) -> dict | None:
    """
    Pure CPU computation — safe to run in a thread executor.

    Input rows have keys: embedding_content (str), display_tags_meta (str|list|None),
    bookmarked_at (datetime), removed_at (datetime|None).

    Returns:
        { taste_vector: list[float], top_tags: list[dict], bookmark_count: int }
        or None if no usable rows.
    """
    vectors: list[np.ndarray] = []
    weights: list[float] = []
    tag_accum: dict[str, dict] = {}  # key = tag.lower()

    for row in rows:
        weight = _retention_weight(row["removed_at"], row["bookmarked_at"])

        # ── taste vector ──────────────────────────────────────────────────────
        raw_vec = row.get("embedding_content")
        if raw_vec is None:
            continue
        try:
            vec = np.array(json.loads(raw_vec), dtype=np.float32)
        except (ValueError, TypeError):
            continue
        vectors.append(vec)
        weights.append(weight)

        # ── top tags ──────────────────────────────────────────────────────────
        meta = row.get("display_tags_meta")
        if meta is None:
            continue
        if isinstance(meta, str):
            try:
                meta = json.loads(meta)
            except (ValueError, TypeError):
                continue
        for entry in meta:
            tag = entry.get("tag", "")
            if not tag:
                continue
            tag_type = entry.get("type", "tags")
            key = tag.lower()
            if key not in tag_accum:
                tag_accum[key] = {"tag": tag, "type": tag_type, "freq": 0.0}
            tag_accum[key]["freq"] += weight

    if not vectors:
        return None

    # Weighted average + L2 normalisation
    weight_array = np.array(weights, dtype=np.float32)
    stacked = np.stack(vectors, axis=0)                          # (N, 384)
    weighted_sum = (stacked * weight_array[:, np.newaxis]).sum(axis=0)  # (384,)

    norm = float(np.linalg.norm(weighted_sum))
    if norm < 1e-9:
        return None
    taste_vector = (weighted_sum / norm).tolist()

    # Top-10 tags by weighted frequency
    top_tags = sorted(tag_accum.values(), key=lambda x: -x["freq"])[:10]
    top_tags = [
        {"tag": t["tag"], "freq": round(t["freq"], 4), "type": t["type"]}
        for t in top_tags
    ]

    return {
        "taste_vector": taste_vector,
        "top_tags": top_tags,
        "bookmark_count": len(vectors),
    }


# ---------------------------------------------------------------------------
# Async batch processing
# ---------------------------------------------------------------------------

async def _process_batch() -> dict:
    user_ids = await database.get_all_bookmark_user_ids()

    if not user_ids:
        logger.debug("user_profile: no users with bookmarks")
        return {"status": "skipped", "users_processed": 0, "users_skipped": 0}

    logger.info("user_profile: processing %d user(s)", len(user_ids))

    loop = asyncio.get_event_loop()
    processed = 0
    skipped = 0

    for user_id in user_ids:
        rows = await database.get_user_bookmark_data(user_id)

        if not rows:
            logger.debug("user_profile: user=%s has no embedded bookmarks, skipping", user_id)
            skipped += 1
            continue

        row_dicts = [dict(row) for row in rows]

        profile = await loop.run_in_executor(None, partial(_compute_profile, row_dicts))

        if profile is None:
            logger.debug("user_profile: user=%s profile computation yielded no vector, skipping", user_id)
            skipped += 1
            continue

        await database.upsert_user_profile(
            user_id=user_id,
            taste_vector_json=json.dumps(profile["taste_vector"]),
            top_tags_json=json.dumps(profile["top_tags"]),
            bookmark_count=profile["bookmark_count"],
        )
        processed += 1
        logger.debug(
            "user_profile: upserted profile for user=%s (bookmarks=%d)",
            user_id,
            profile["bookmark_count"],
        )

    return {"status": "success", "users_processed": processed, "users_skipped": skipped}


# ---------------------------------------------------------------------------
# Entry point (called by APScheduler)
# ---------------------------------------------------------------------------

async def run_profile_job() -> None:
    """
    Recompute user profiles for all users with bookmarks.
    Called by APScheduler every profile_coordinator_interval seconds.
    """
    start = time.monotonic()
    try:
        result = await _process_batch()
        duration_ms = int((time.monotonic() - start) * 1000)
        logger.info(
            "user_profile job: status=%s users_processed=%d users_skipped=%d duration_ms=%d",
            result["status"],
            result.get("users_processed", 0),
            result.get("users_skipped", 0),
            duration_ms,
        )
    except Exception as exc:
        duration_ms = int((time.monotonic() - start) * 1000)
        logger.error(
            "user_profile job failed after %dms: %s", duration_ms, exc, exc_info=True
        )
