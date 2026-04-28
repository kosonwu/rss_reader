"""
APScheduler coordinator.
Runs a single job on a fixed interval; checks which feeds are due and
spawns asyncio tasks for each — avoids per-feed job management.
"""

from __future__ import annotations

import asyncio
import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler

import database
from config import settings
from embedding_service import run_embedding_job
from feed_fetcher import fetch_feed, _fetch_article_page
from tag_extraction_service import run_tag_extraction_job
from ner_service import run_ner_job
from user_profile_service import run_profile_job

logger = logging.getLogger(__name__)

_scheduler: AsyncIOScheduler | None = None

# Track in-flight fetch tasks so we don't double-fetch the same feed
_in_flight: set[str] = set()


async def _coordinator() -> None:
    """Check for due feeds and launch fetch tasks."""
    try:
        due_feeds = await database.get_due_feeds()
    except Exception as exc:
        logger.error("coordinator: failed to query due feeds: %s", exc)
        return

    if not due_feeds:
        logger.debug("coordinator: no feeds due")
        return

    logger.info("coordinator: %d feed(s) due", len(due_feeds))

    for row in due_feeds:
        feed_id = str(row["id"])
        if feed_id in _in_flight:
            logger.debug("coordinator: feed=%s already in flight, skipping", feed_id)
            continue

        _in_flight.add(feed_id)
        asyncio.create_task(_run_and_release(feed_id, str(row["url"])))


async def _run_and_release(feed_id: str, feed_url: str) -> None:
    try:
        await fetch_feed(feed_id, feed_url)
    finally:
        _in_flight.discard(feed_id)


async def _og_image_backfill() -> None:
    """Batch-fill og_image_url for existing articles that have none."""
    try:
        items = await database.get_items_missing_og_image(20)
    except Exception as exc:
        logger.error("og_image_backfill: db query failed: %s", exc)
        return

    if not items:
        logger.debug("og_image_backfill: nothing to backfill")
        return

    filled = 0
    for row in items:
        og_image_url, _ = await _fetch_article_page(str(row["url"]))
        if og_image_url:
            await database.update_item_og_image(str(row["id"]), og_image_url)
            filled += 1

    logger.info("og_image_backfill: filled=%d / checked=%d", filled, len(items))


def start_scheduler() -> None:
    global _scheduler
    _scheduler = AsyncIOScheduler()
    _scheduler.add_job(
        _coordinator,
        trigger="interval",
        seconds=settings.fetch_coordinator_interval,
        id="coordinator",
        max_instances=1,
        coalesce=True,
    )
    _scheduler.add_job(
        run_embedding_job,
        trigger="interval",
        seconds=settings.embedding_coordinator_interval,
        id="embedding_coordinator",
        max_instances=1,
        coalesce=True,
    )
    _scheduler.add_job(
        run_tag_extraction_job,
        trigger="interval",
        seconds=settings.tag_extraction_coordinator_interval,
        id="tag_extraction_coordinator",
        max_instances=1,
        coalesce=True,
    )
    _scheduler.add_job(
        run_ner_job,
        trigger="interval",
        seconds=settings.ner_coordinator_interval,
        id="ner_coordinator",
        max_instances=1,
        coalesce=True,
    )
    _scheduler.add_job(
        run_profile_job,
        trigger="interval",
        seconds=settings.profile_coordinator_interval,
        id="profile_coordinator",
        max_instances=1,
        coalesce=True,
    )
    _scheduler.add_job(
        _og_image_backfill,
        trigger="interval",
        seconds=settings.og_image_backfill_interval,
        id="og_image_backfill",
        max_instances=1,
        coalesce=True,
    )
    _scheduler.start()
    logger.info(
        "scheduler started (fetch_interval=%ds, embedding_interval=%ds, "
        "tag_extraction_interval=%ds, ner_interval=%ds, profile_interval=%ds, "
        "og_image_backfill_interval=%ds)",
        settings.fetch_coordinator_interval,
        settings.embedding_coordinator_interval,
        settings.tag_extraction_coordinator_interval,
        settings.ner_coordinator_interval,
        settings.profile_coordinator_interval,
        settings.og_image_backfill_interval,
    )


def stop_scheduler() -> None:
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("scheduler stopped")


def get_scheduler_state() -> dict:
    if _scheduler is None:
        return {"running": False}
    return {
        "running": _scheduler.running,
        "in_flight_feeds": list(_in_flight),
        "jobs": [
            {
                "id": job.id,
                "next_run": job.next_run_time.isoformat() if job.next_run_time else None,
            }
            for job in _scheduler.get_jobs()
        ],
    }
