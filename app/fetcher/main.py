"""
FastAPI application entry point.
Manages startup/shutdown of the DB pool, HTTP client, and scheduler.
"""

from __future__ import annotations

import asyncio
import logging
from functools import partial

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

import database
import embedding_service
import scheduler as sched
from config import settings
from feed_fetcher import close_http_client, fetch_feed

logging.basicConfig(
    level=settings.log_level.upper(),
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(title="RSS Fetcher", version="0.1.0")


# ---------------------------------------------------------------------------
# Lifecycle
# ---------------------------------------------------------------------------

@app.on_event("startup")
async def on_startup() -> None:
    await database.init_pool()
    sched.start_scheduler()
    logger.info("RSS fetcher service started")


@app.on_event("shutdown")
async def on_shutdown() -> None:
    sched.stop_scheduler()
    await close_http_client()
    await database.close_pool()
    logger.info("RSS fetcher service stopped")


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@app.get("/status")
async def status() -> dict:
    active_feeds = await database.get_active_feed_count()
    return {
        "active_feeds": active_feeds,
        "scheduler": sched.get_scheduler_state(),
    }


@app.post("/fetch/{feed_id}")
async def trigger_fetch(feed_id: str) -> dict:
    """Manually trigger a fetch for a specific feed (useful for testing)."""
    row = await database.get_feed_by_id(feed_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Feed not found")
    if row["fetch_status"] not in ("active", "error", "pending"):
        raise HTTPException(
            status_code=400,
            detail=f"Feed status is '{row['fetch_status']}'; only 'active', 'error', or 'pending' feeds can be fetched",
        )
    asyncio.create_task(fetch_feed(str(row["id"]), str(row["url"])))
    return {"queued": True, "feed_id": feed_id, "url": str(row["url"])}


class QueryRequest(BaseModel):
    query: str
    user_id: str
    limit: int = 20


@app.post("/embed/query")
async def embed_and_search(req: QueryRequest) -> list[dict]:
    """Embed a query string and return the most semantically similar feed items for a user."""
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="query must not be empty")
    model = embedding_service._get_model()
    loop = asyncio.get_event_loop()
    vecs = await loop.run_in_executor(
        None, partial(embedding_service._encode, model, [req.query])
    )
    rows = await database.search_user_items(vecs[0], req.user_id, req.limit)
    return [dict(row) for row in rows]
