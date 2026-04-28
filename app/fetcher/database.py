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
        min_size=1,
        max_size=5,
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
            row = await conn.fetchrow(
                """
                INSERT INTO feed_items
                    (feed_id, guid, title, description, content, url, author,
                     og_image_url, content_source, published_at, reading_time_minutes, fetched_at)
                VALUES
                    ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now())
                ON CONFLICT (feed_id, guid) DO UPDATE
                    SET og_image_url = COALESCE(feed_items.og_image_url, EXCLUDED.og_image_url)
                RETURNING (xmax = 0) AS is_insert
                """,
                feed_id,
                item["guid"],
                item.get("title"),
                item.get("description"),
                item.get("content"),
                item.get("url"),
                item.get("author"),
                item.get("og_image_url"),
                item.get("content_source"),
                item.get("published_at"),
                item.get("reading_time_minutes", 1),
            )
            # xmax = 0 means newly inserted row (not an update)
            if row and row["is_insert"]:
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


async def insert_embedding_log(
    status: str,
    items_fetched: int = 0,
    items_embedded: int = 0,
    items_skipped: int = 0,
    items_remaining_after: int | None = None,
    duration_ms: int | None = None,
    model_name: str | None = None,
    error_message: str | None = None,
) -> None:
    pool = get_pool()
    await pool.execute(
        """
        INSERT INTO fetch_embedding_logs
            (status, items_fetched, items_embedded, items_skipped, items_remaining_after, duration_ms, model_name, error_message)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        """,
        status,
        items_fetched,
        items_embedded,
        items_skipped,
        items_remaining_after,
        duration_ms,
        model_name,
        error_message,
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


# ---------------------------------------------------------------------------
# Embedding queries
# ---------------------------------------------------------------------------

async def count_unembedded_items() -> int:
    """Return the total number of feed_items not yet embedded."""
    pool = get_pool()
    row = await pool.fetchrow("SELECT COUNT(*) AS n FROM feed_items WHERE embedded_at IS NULL")
    return int(row["n"])


async def get_unembedded_items(limit: int) -> list[asyncpg.Record]:
    """Return feed_items where embedded_at IS NULL, oldest first."""
    pool = get_pool()
    return await pool.fetch(
        """
        SELECT id, title, content
        FROM   feed_items
        WHERE  embedded_at IS NULL
        ORDER  BY fetched_at ASC
        LIMIT  $1
        """,
        limit,
    )


async def mark_items_skipped(ids: list[str]) -> None:
    """Set embedded_at = now() for items with no embeddable content (skip re-scanning)."""
    pool = get_pool()
    await pool.execute(
        "UPDATE feed_items SET embedded_at = now() WHERE id = ANY($1::uuid[])",
        ids,
    )


async def update_item_embeddings(
    item_id: str,
    embedding_title: str,
    embedding_content: str,
    model: str,
) -> None:
    """Write vector embeddings for one feed_item. Vectors passed as JSON strings, cast to vector in SQL."""
    pool = get_pool()
    await pool.execute(
        """
        UPDATE feed_items
        SET    embedding_title   = $2::vector,
               embedding_content = $3::vector,
               embedding_model   = $4,
               embedded_at       = now()
        WHERE  id = $1
        """,
        item_id,
        embedding_title,
        embedding_content,
        model,
    )


# ---------------------------------------------------------------------------
# Tag extraction queries
# ---------------------------------------------------------------------------

async def count_untagged_items() -> int:
    """Return the total number of feed_items not yet tag-extracted."""
    pool = get_pool()
    row = await pool.fetchrow("SELECT COUNT(*) AS n FROM feed_items WHERE tags_extracted_at IS NULL")
    return int(row["n"])


async def get_untagged_items(limit: int) -> list[asyncpg.Record]:
    """Return feed_items where tags_extracted_at IS NULL, oldest first.
    Includes the parent feed's language so the caller can tune extraction."""
    pool = get_pool()
    return await pool.fetch(
        """
        SELECT fi.id, fi.title, fi.content, f.language
        FROM   feed_items fi
        JOIN   feeds f ON f.id = fi.feed_id
        WHERE  fi.tags_extracted_at IS NULL
        ORDER  BY fi.fetched_at ASC
        LIMIT  $1
        """,
        limit,
    )


async def mark_items_tags_skipped(ids: list[str]) -> None:
    """Set tags_extracted_at = now() for items with no extractable content."""
    pool = get_pool()
    await pool.execute(
        "UPDATE feed_items SET tags_extracted_at = now() WHERE id = ANY($1::uuid[])",
        ids,
    )


async def update_item_tags(
    item_id: str,
    tags: list[str],
    scores: list[float],
    model: str,
) -> None:
    """Write extracted tags for one feed_item."""
    pool = get_pool()
    await pool.execute(
        """
        UPDATE feed_items
        SET    tags              = $2::text[],
               tags_scores       = $3::real[],
               tags_model        = $4,
               tags_extracted_at = now()
        WHERE  id = $1
        """,
        item_id,
        tags,
        scores,
        model,
    )


async def insert_tag_extraction_log(
    status: str,
    items_fetched: int = 0,
    items_tagged: int = 0,
    items_skipped: int = 0,
    items_remaining_after: int | None = None,
    duration_ms: int | None = None,
    model_name: str | None = None,
    error_message: str | None = None,
) -> None:
    pool = get_pool()
    await pool.execute(
        """
        INSERT INTO fetch_tag_extraction_logs
            (status, items_fetched, items_tagged, items_skipped,
             items_remaining_after, duration_ms, model_name, error_message)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        """,
        status,
        items_fetched,
        items_tagged,
        items_skipped,
        items_remaining_after,
        duration_ms,
        model_name,
        error_message,
    )


# ---------------------------------------------------------------------------
# NER queries
# ---------------------------------------------------------------------------

async def count_unner_items() -> int:
    """Return the total number of feed_items that have tags but are not yet NER-extracted."""
    pool = get_pool()
    row = await pool.fetchrow(
        "SELECT COUNT(*) AS n FROM feed_items WHERE tags_extracted_at IS NOT NULL AND ner_extracted_at IS NULL"
    )
    return int(row["n"])


async def get_unner_items(limit: int) -> list[asyncpg.Record]:
    """Return feed_items that have tags but ner_extracted_at IS NULL, oldest first.
    Includes the parent feed's language so the caller can route to CKIP or spaCy."""
    pool = get_pool()
    return await pool.fetch(
        """
        SELECT fi.id, fi.title, fi.content, f.language
        FROM   feed_items fi
        JOIN   feeds f ON f.id = fi.feed_id
        WHERE  fi.tags_extracted_at IS NOT NULL
          AND  fi.ner_extracted_at IS NULL
        ORDER  BY fi.fetched_at ASC
        LIMIT  $1
        """,
        limit,
    )


async def mark_items_ner_skipped(ids: list[str]) -> None:
    """Set ner_extracted_at = now() for items with no extractable content."""
    pool = get_pool()
    await pool.execute(
        "UPDATE feed_items SET ner_extracted_at = now() WHERE id = ANY($1::uuid[])",
        ids,
    )


async def update_item_ner(
    item_id: str,
    entities: list[dict],
    model: str,
) -> None:
    """Write extracted NER entities for one feed_item."""
    import json as _json
    pool = get_pool()
    await pool.execute(
        """
        UPDATE feed_items
        SET    ner_entities      = $2::jsonb,
               ner_model         = $3,
               ner_extracted_at  = now()
        WHERE  id = $1
        """,
        item_id,
        _json.dumps(entities),
        model,
    )


async def insert_ner_log(
    status: str,
    items_fetched: int = 0,
    items_tagged: int = 0,
    items_skipped: int = 0,
    items_remaining_after: int | None = None,
    duration_ms: int | None = None,
    model_name: str | None = None,
    error_message: str | None = None,
) -> None:
    pool = get_pool()
    await pool.execute(
        """
        INSERT INTO fetch_ner_logs
            (status, items_fetched, items_tagged, items_skipped,
             items_remaining_after, duration_ms, model_name, error_message)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        """,
        status,
        items_fetched,
        items_tagged,
        items_skipped,
        items_remaining_after,
        duration_ms,
        model_name,
        error_message,
    )


# ---------------------------------------------------------------------------
# display_tags queries
# ---------------------------------------------------------------------------

async def get_items_ready_for_display_tags(limit: int) -> list[asyncpg.Record]:
    """Return feed_items where both NER and tag extraction are done but display_tags not yet computed."""
    pool = get_pool()
    return await pool.fetch(
        """
        SELECT fi.id, fi.title, fi.ner_entities, fi.tags, fi.tags_scores,
               fi.feed_id, fi.published_at
        FROM   feed_items fi
        WHERE  fi.ner_extracted_at IS NOT NULL
          AND  fi.tags_extracted_at IS NOT NULL
          AND  fi.display_tags_updated_at IS NULL
        ORDER  BY fi.fetched_at ASC
        LIMIT  $1
        """,
        limit,
    )


async def update_item_display_tags(
    item_id: str,
    display_tags: list[str],
    display_tags_meta: list[dict],
) -> None:
    """Write computed display_tags for one feed_item."""
    import json as _json
    pool = get_pool()
    await pool.execute(
        """
        UPDATE feed_items
        SET    display_tags             = $2::text[],
               display_tags_meta        = $3::jsonb,
               display_tags_updated_at  = now()
        WHERE  id = $1
        """,
        item_id,
        display_tags,
        _json.dumps(display_tags_meta),
    )


async def upsert_entity_tag_index(entries: list[dict]) -> None:
    """Batch-insert display_tags into entity_tag_index. ON CONFLICT DO NOTHING (idempotent)."""
    if not entries:
        return
    pool = get_pool()
    await pool.executemany(
        """
        INSERT INTO entity_tag_index
               (entity_text, entity_text_lower, entity_type,
                feed_item_id, feed_id, score, published_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (feed_item_id, entity_text_lower) DO NOTHING
        """,
        [
            (
                e["tag"],
                e["tag"].lower(),
                e["type"],
                e["feed_item_id"],
                e["feed_id"],
                e["score"],
                e["published_at"],
            )
            for e in entries
        ],
    )


async def search_user_items(
    query_vector: list[float],
    user_id: str,
    limit: int = 20,
) -> list[asyncpg.Record]:
    """Vector similarity search scoped to a user's active subscriptions."""
    import json as _json
    pool = get_pool()
    vector_str = _json.dumps(query_vector)
    return await pool.fetch(
        """
        SELECT fi.id, fi.feed_id, fi.title, fi.description,
               fi.url, fi.og_image_url, fi.published_at, fi.reading_time_minutes
        FROM   feed_items fi
        JOIN   feeds f ON f.id = fi.feed_id
        JOIN   user_subscriptions us
               ON us.feed_id = f.id AND us.user_id = $2 AND us.is_active = true
        WHERE  fi.embedded_at IS NOT NULL
        ORDER  BY fi.embedding_content <=> $1::vector ASC
        LIMIT  $3
        """,
        vector_str,
        user_id,
        limit,
    )


async def get_all_bookmark_user_ids() -> list[str]:
    """Return all distinct user_ids that have at least one bookmark (active or soft-deleted)."""
    pool = get_pool()
    rows = await pool.fetch("SELECT DISTINCT user_id FROM user_bookmarks")
    return [row["user_id"] for row in rows]


async def get_user_bookmark_data(user_id: str) -> list[asyncpg.Record]:
    """
    Return ALL bookmarks for a user (active and soft-deleted) that have embeddings.
    Includes embedding_content and display_tags_meta for profile computation.
    embedding_content is cast to text so asyncpg doesn't raise a codec error for vector columns.
    """
    pool = get_pool()
    return await pool.fetch(
        """
        SELECT
            ub.bookmarked_at,
            ub.removed_at,
            fi.embedding_content::text  AS embedding_content,
            fi.display_tags_meta        AS display_tags_meta
        FROM   user_bookmarks ub
        JOIN   feed_items fi ON fi.id = ub.feed_item_id
        WHERE  ub.user_id = $1
          AND  fi.embedding_content IS NOT NULL
        """,
        user_id,
    )


async def get_items_missing_og_image(limit: int) -> list[asyncpg.Record]:
    """Return feed_items with no og_image_url that have a URL, newest first."""
    pool = get_pool()
    return await pool.fetch(
        """
        SELECT id, url FROM feed_items
        WHERE og_image_url IS NULL AND url IS NOT NULL
        ORDER BY fetched_at DESC
        LIMIT $1
        """,
        limit,
    )


async def update_item_og_image(item_id: str, og_image_url: str) -> None:
    """Set og_image_url only if currently NULL (never overwrites existing value)."""
    pool = get_pool()
    await pool.execute(
        "UPDATE feed_items SET og_image_url = $2 WHERE id = $1 AND og_image_url IS NULL",
        item_id,
        og_image_url,
    )


async def upsert_user_profile(
    user_id: str,
    taste_vector_json: str,
    top_tags_json: str,
    bookmark_count: int,
) -> None:
    """Upsert user_profiles row. Vectors and JSONB are passed as JSON strings with SQL casts."""
    pool = get_pool()
    await pool.execute(
        """
        INSERT INTO user_profiles (user_id, taste_vector, top_tags, bookmark_count, updated_at)
        VALUES ($1, $2::vector, $3::jsonb, $4, now())
        ON CONFLICT (user_id) DO UPDATE
            SET taste_vector   = EXCLUDED.taste_vector,
                top_tags       = EXCLUDED.top_tags,
                bookmark_count = EXCLUDED.bookmark_count,
                updated_at     = now()
        """,
        user_id,
        taste_vector_json,
        top_tags_json,
        bookmark_count,
    )
