"""
Database connection pool and all query functions.
Uses asyncpg directly — no ORM — to keep the service self-contained.
"""

from __future__ import annotations

import asyncpg
from config import settings

_pool: asyncpg.Pool | None = None


async def init_pool() -> None:
    global _pool
    _pool = await asyncpg.create_pool(
        dsn=settings.database_url,
        min_size=2,
        max_size=10,
        command_timeout=30,
    )


async def close_pool() -> None:
    global _pool
    if _pool:
        await _pool.close()
        _pool = None


def get_pool() -> asyncpg.Pool:
    if _pool is None:
        raise RuntimeError("Database pool is not initialised")
    return _pool


# ---------------------------------------------------------------------------
# Reads
# ---------------------------------------------------------------------------

async def get_due_feeds() -> list[asyncpg.Record]:
    """
    Return all feeds due for fetching.
    - 'pending': never fetched yet — always due (validates the feed for the first time)
    - 'active': due when last_fetched_at + fetch_interval_minutes <= now()
    On success both become 'active'; on failure both become 'error'.
    """
    pool = get_pool()
    return await pool.fetch(
        """
        SELECT id, url, fetch_interval_minutes, last_fetched_at
        FROM   feeds
        WHERE  fetch_status = 'pending'
           OR (
                fetch_status = 'active'
                AND (
                      last_fetched_at IS NULL
                   OR last_fetched_at + (fetch_interval_minutes || ' minutes')::interval <= now()
                )
              )
        """,
    )


async def get_active_feed_count() -> int:
    pool = get_pool()
    row = await pool.fetchrow("SELECT count(*) AS n FROM feeds WHERE fetch_status = 'active'")
    return int(row["n"])


async def get_feed_by_id(feed_id: str) -> asyncpg.Record | None:
    pool = get_pool()
    return await pool.fetchrow(
        "SELECT id, url, fetch_status, fetch_interval_minutes FROM feeds WHERE id = $1",
        feed_id,
    )


# ---------------------------------------------------------------------------
# Writes
# ---------------------------------------------------------------------------

async def upsert_feed_items(feed_id: str, items: list[dict]) -> int:
    """
    Insert new feed items; skip duplicates (feed_id, guid).
    Returns the number of rows actually inserted.
    """
    if not items:
        return 0

    pool = get_pool()
    inserted = 0
    async with pool.acquire() as conn:
        for item in items:
            result = await conn.execute(
                """
                INSERT INTO feed_items
                    (feed_id, guid, title, description, content, url, author,
                     og_image_url, published_at, fetched_at)
                VALUES
                    ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
                ON CONFLICT (feed_id, guid) DO NOTHING
                """,
                feed_id,
                item["guid"],
                item.get("title"),
                item.get("description"),
                item.get("content"),
                item.get("url"),
                item.get("author"),
                item.get("og_image_url"),
                item.get("published_at"),
            )
            # asyncpg returns "INSERT 0 N" — parse N
            if result.split()[-1] == "1":
                inserted += 1
    return inserted


async def update_feed_success(feed_id: str) -> None:
    pool = get_pool()
    await pool.execute(
        """
        UPDATE feeds
        SET    last_fetched_at = now(),
               last_fetch_error = NULL,
               fetch_status = 'active',
               updated_at = now()
        WHERE  id = $1
        """,
        feed_id,
    )


async def update_feed_error(feed_id: str, error: str) -> None:
    pool = get_pool()
    await pool.execute(
        """
        UPDATE feeds
        SET    last_fetched_at = now(),
               last_fetch_error = $2,
               fetch_status = 'error',
               updated_at = now()
        WHERE  id = $1
        """,
        feed_id,
        error[:2000],  # cap to avoid giant error strings
    )


async def insert_fetch_log(
    feed_id: str,
    status: str,
    article_count: int = 0,
    duration_ms: int | None = None,
    error_message: str | None = None,
) -> None:
    pool = get_pool()
    await pool.execute(
        """
        INSERT INTO fetch_logs (feed_id, status, article_count, duration_ms, error_message)
        VALUES ($1, $2, $3, $4, $5)
        """,
        feed_id,
        status,
        article_count,
        duration_ms,
        error_message,
    )
