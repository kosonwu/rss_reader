"""
NER background service.
Uses CKIP CkipNerChunker for zh-TW feed items and spaCy en_core_web_sm for all others.
Entity labels are normalised to the unified OntoNotes namespace defined in _LABEL_MAP.
"""

from __future__ import annotations

import asyncio
import logging
import re
import time
from collections import Counter

import numpy as np
from ckip_transformers.nlp import CkipNerChunker

import database
import embedding_service
from config import settings
from text_utils import clean_token, preprocess

logger = logging.getLogger(__name__)

_BATCH_SIZE = 10


def _ckip_model_display_name() -> str:
    return f"ckip:{settings.ner_ckip_model}"


def _spacy_model_display_name() -> str:
    return f"spacy:{settings.ner_spacy_model}"

# CKIP uses ORGANIZATION / LOCATION; spaCy already uses the unified labels.
_LABEL_MAP: dict[str, str] = {
    "ORGANIZATION": "ORG",
    "LOCATION": "LOC",
}

_ckip_ner: CkipNerChunker | None = None
_spacy_nlp = None  # spacy.Language — imported lazily to avoid hard dep at module load

# ---------------------------------------------------------------------------
# display_tags scoring
# ---------------------------------------------------------------------------

_DISPLAY_NER_TYPES: dict[str, float] = {"ORG": 5, "PRODUCT": 4, "PERSON": 3, "GPE": 2, "LOC": 2}
_KEYBERT_BASE_SCORES = [2.0, 1.8, 1.5, 1.2]
_MAX_DISPLAY_TAGS = 5


def compute_display_tags(
    ner_entities: list[dict],
    title: str,
    tags: list[str],
    tags_scores: list[float],
) -> list[dict]:
    """Compute display_tags by scoring NER entities and KeyBERT tags then merging.

    Scoring rules:
    - NER: base score by type (ORG=5, PRODUCT=4, PERSON=3, GPE/LOC=2)
            +1.5 if entity text appears in title
            +0.5 * N where N = count of same type in ner_entities
    - KeyBERT: top-4 by tags_scores get 2.0/1.8/1.5/1.2 base
               +1.5 if tag appears in title
    - Dedup: NER takes priority over KeyBERT on same text (case-insensitive)
    - Returns up to 5 items sorted by score descending.
    """
    title_lower = (title or "").lower()
    candidates: dict[str, dict] = {}  # key = text.lower()

    # NER candidates
    type_counts = Counter(
        e["type"] for e in ner_entities if e["type"] in _DISPLAY_NER_TYPES
    )
    for entity in ner_entities:
        etype = entity["type"]
        if etype not in _DISPLAY_NER_TYPES:
            continue
        text = clean_token(entity["text"])
        if not text:
            continue
        score = _DISPLAY_NER_TYPES[etype]
        if text.lower() in title_lower:
            score += 1.5
        score += 0.5 * type_counts[etype]
        key = text.lower()
        if key not in candidates or candidates[key]["score"] < score:
            candidates[key] = {"tag": text, "type": etype, "score": score}

    # KeyBERT candidates — take top-4 by tags_scores
    paired = sorted(zip(tags, tags_scores), key=lambda x: -x[1])[:4]
    for rank, (tag, _) in enumerate(paired):
        tag = clean_token(tag)
        if not tag:
            continue
        base = _KEYBERT_BASE_SCORES[rank]
        if tag.lower() in title_lower:
            base += 1.5
        key = tag.lower()
        if key not in candidates:  # NER takes priority
            candidates[key] = {"tag": tag, "type": "tags", "score": base}

    result = sorted(candidates.values(), key=lambda x: -x["score"])[:_MAX_DISPLAY_TAGS]
    return [{"tag": r["tag"], "type": r["type"], "score": round(r["score"], 2)} for r in result]


def _get_ckip_ner() -> CkipNerChunker:
    global _ckip_ner
    if _ckip_ner is None:
        logger.info("ner: initialising CKIP NER chunker (%s)", settings.ner_ckip_model)
        _ckip_ner = CkipNerChunker(model=settings.ner_ckip_model)
        logger.info("ner: CKIP NER chunker ready")
    return _ckip_ner


def _get_spacy_nlp():
    global _spacy_nlp
    if _spacy_nlp is None:
        import spacy
        logger.info("ner: loading spaCy %s", settings.ner_spacy_model)
        _spacy_nlp = spacy.load(settings.ner_spacy_model)
        logger.info("ner: spaCy %s ready", settings.ner_spacy_model)
    return _spacy_nlp


def _normalize_label(label: str) -> str:
    return _LABEL_MAP.get(label, label)


_SIM_THRESHOLD_ZH = 0.85
_SIM_THRESHOLD_EN = 0.80


def _deduplicate_entities_by_similarity(
    entities: list[dict],
    language: str | None,
) -> list[dict]:
    """Remove semantically near-duplicate entities within one item using pairwise cosine similarity.

    - Only compares entities of the **same type** to avoid cross-type false merges.
    - When two entities exceed the threshold, keeps the longer text (more complete form).
    - Thresholds: zh-TW=0.85, others=0.80.
    """
    if len(entities) <= 1:
        return entities

    threshold = _SIM_THRESHOLD_ZH if language == "zh-TW" else _SIM_THRESHOLD_EN

    # Group indices by type
    by_type: dict[str, list[int]] = {}
    for idx, e in enumerate(entities):
        by_type.setdefault(e["type"], []).append(idx)

    # Encode all entity texts in one batch for efficiency
    model = embedding_service._get_model()
    texts = [e["text"] for e in entities]
    embeddings = model.encode(texts, convert_to_numpy=True)
    norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
    embeddings = embeddings / np.maximum(norms, 1e-9)

    drop: set[int] = set()
    for etype, indices in by_type.items():
        if len(indices) <= 1:
            continue
        for a in range(len(indices)):
            i = indices[a]
            if i in drop:
                continue
            for b in range(a + 1, len(indices)):
                j = indices[b]
                if j in drop:
                    continue
                sim = float(np.dot(embeddings[i], embeddings[j]))
                if sim >= threshold:
                    # Drop the shorter (less complete) text
                    if len(entities[j]["text"]) > len(entities[i]["text"]):
                        drop.add(i)
                        break  # i is dropped; no need to compare i further
                    else:
                        drop.add(j)

    result = [e for idx, e in enumerate(entities) if idx not in drop]
    if len(result) < len(entities):
        logger.debug(
            "ner dedup: removed %d near-duplicate entity(ies) (lang=%s, threshold=%.2f)",
            len(entities) - len(result), language, threshold,
        )
    return result


_TRUNCATED_PREFIX_RE_CACHE: dict[str, re.Pattern] = {}


def _restore_truncated_prefix(entity_text: str, source_text: str) -> str:
    """Restore uppercase letters that CKIP's tokenizer stripped from the front of an entity.

    CKIP splits ASCII abbreviations character-by-character (e.g. "SK" → "S" + "K"), so the
    NER span often starts one letter too late.  Example: source has "SK 海力士" but CKIP
    returns token.word = "K 海力士" because the "S" token was not included in the entity span.

    Strategy: if the entity text appears in the source immediately preceded by one or more
    uppercase ASCII letters, prepend those letters.  A word-boundary lookbehind (`(?<![A-Za-z])`)
    prevents false matches inside the middle of a real word.
    """
    if not entity_text or not entity_text[0].isupper():
        return entity_text
    if entity_text not in _TRUNCATED_PREFIX_RE_CACHE:
        _TRUNCATED_PREFIX_RE_CACHE[entity_text] = re.compile(
            r'(?<![A-Za-z])([A-Z]+)' + re.escape(entity_text)
        )
    m = _TRUNCATED_PREFIX_RE_CACHE[entity_text].search(source_text)
    if m and m.group(1):
        return m.group(1) + entity_text
    return entity_text


def _run_ckip_ner_sync(texts: list[str]) -> list[list[dict]]:
    """Synchronous batch CKIP NER — runs in executor to avoid blocking the event loop.
    Returns a list of entity lists, one per input text, deduplicated by (text, type)."""
    ner = _get_ckip_ner()
    batch_results = ner(texts)  # List[List[NerToken]]
    out: list[list[dict]] = []
    for source_text, result in zip(texts, batch_results):
        seen: set[tuple[str, str]] = set()
        entities: list[dict] = []
        for token in result:
            label = _normalize_label(token.ner)
            text = clean_token(token.word)
            if not text:
                continue
            # CKIP splits ASCII abbreviations into individual characters; the NER span
            # may therefore start one letter too late (e.g. "K 海力士" instead of "SK 海力士").
            # Restore the missing uppercase prefix by looking back in the source text.
            text = _restore_truncated_prefix(text, source_text)
            key = (text, label)
            if key not in seen:
                seen.add(key)
                entities.append({"text": text, "type": label})
        out.append(entities)
    return out


def _run_spacy_ner_sync(texts: list[str]) -> list[list[dict]]:
    """Synchronous batch spaCy NER — runs in executor to avoid blocking the event loop.
    Returns a list of entity lists, one per input text, deduplicated by (text, type)."""
    nlp = _get_spacy_nlp()
    out: list[list[dict]] = []
    for doc in nlp.pipe(texts):
        seen: set[tuple[str, str]] = set()
        entities: list[dict] = []
        for ent in doc.ents:
            text = clean_token(ent.text)
            if not text:
                continue
            key = (text, ent.label_)
            if key not in seen:
                seen.add(key)
                entities.append({"text": text, "type": ent.label_})
        out.append(entities)
    return out


async def run_ner_job() -> None:
    """
    Batch-extract NER entities for up to _BATCH_SIZE unprocessed feed_items.
    Called by APScheduler every ner_coordinator_interval seconds.
    """
    start = time.monotonic()
    try:
        result = await _process_batch()
        duration_ms = int((time.monotonic() - start) * 1000)
        remaining = await database.count_unner_items()
        await database.insert_ner_log(
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
        logger.error("ner job failed: %s", exc, exc_info=True)
        remaining = await database.count_unner_items()
        await database.insert_ner_log(
            status="failed",
            items_remaining_after=remaining,
            duration_ms=duration_ms,
            error_message=str(exc)[:2000],
        )
    finally:
        await _run_display_tags_pass()


async def _run_display_tags_pass() -> None:
    """Compute and persist display_tags for items where both NER and tag extraction are done."""
    import json as _json

    def _parse_jsonb(value) -> list:
        """asyncpg returns jsonb columns as raw strings; parse them to Python objects."""
        if value is None:
            return []
        if isinstance(value, str):
            return _json.loads(value)
        return list(value)

    try:
        ready = await database.get_items_ready_for_display_tags(limit=20)
        if not ready:
            return
        logger.info("display_tags: processing %d item(s)", len(ready))
        for row in ready:
            meta = compute_display_tags(
                ner_entities=_parse_jsonb(row["ner_entities"]),
                title=row["title"] or "",
                tags=list(row["tags"] or []),
                tags_scores=list(row["tags_scores"] or []),
            )
            display_tags = [m["tag"] for m in meta]
            await database.update_item_display_tags(str(row["id"]), display_tags, meta)
            entries = [
                {
                    **m,
                    "feed_item_id": str(row["id"]),
                    "feed_id": str(row["feed_id"]),
                    "published_at": row["published_at"],
                }
                for m in meta
            ]
            await database.upsert_entity_tag_index(entries)
        logger.info("display_tags: done (%d item(s))", len(ready))
    except Exception as exc:
        logger.error("display_tags pass failed: %s", exc, exc_info=True)


async def _process_batch() -> dict:
    # Step 1: fetch unprocessed items (oldest first)
    items = await database.get_unner_items(_BATCH_SIZE)
    if not items:
        logger.debug("ner: no unprocessed items")
        return {
            "status": "skipped",
            "items_fetched": 0,
            "items_tagged": 0,
            "items_skipped": 0,
            "model_name": None,
        }

    logger.info("ner: processing %d item(s)", len(items))

    # Step 2: separate items with no extractable text
    to_skip = [row for row in items if not row["title"] and not row["content"]]
    to_tag = [row for row in items if row["title"] or row["content"]]

    if to_skip:
        skip_ids = [str(row["id"]) for row in to_skip]
        await database.mark_items_ner_skipped(skip_ids)
        logger.info("ner: skipped %d item(s) with no title/content", len(to_skip))

    if not to_tag:
        return {
            "status": "success",
            "items_fetched": len(items),
            "items_tagged": 0,
            "items_skipped": len(to_skip),
            "model_name": None,
        }

    # Step 3: build input texts (title + content, capped at 2000 chars)
    def _build_text(row) -> str:
        raw = ((row["title"] or "") + " " + (row["content"] or ""))[:2000].strip()
        return preprocess(raw)

    # Step 4: split by language and run models concurrently
    zhtw_indexed = [(i, row) for i, row in enumerate(to_tag) if row["language"] == "zh-TW"]
    other_indexed = [(i, row) for i, row in enumerate(to_tag) if row["language"] != "zh-TW"]

    results: list[list[dict]] = [[] for _ in to_tag]
    models_used: set[str] = set()
    loop = asyncio.get_event_loop()

    tasks = []
    if zhtw_indexed:
        zhtw_texts = [_build_text(row) for _, row in zhtw_indexed]
        tasks.append(loop.run_in_executor(None, _run_ckip_ner_sync, zhtw_texts))
        models_used.add(_ckip_model_display_name())
    if other_indexed:
        other_texts = [_build_text(row) for _, row in other_indexed]
        tasks.append(loop.run_in_executor(None, _run_spacy_ner_sync, other_texts))
        models_used.add(_spacy_model_display_name())

    gathered = await asyncio.gather(*tasks)

    # Merge results back into the original to_tag order
    g_idx = 0
    if zhtw_indexed:
        for (orig_i, _), entities in zip(zhtw_indexed, gathered[g_idx]):
            results[orig_i] = entities
        g_idx += 1
    if other_indexed:
        for (orig_i, _), entities in zip(other_indexed, gathered[g_idx]):
            results[orig_i] = entities

    # Step 4.5: pairwise similarity dedup — remove near-synonym entities per item
    # (same type only; keeps the longer/more complete text when merging)
    results = [
        _deduplicate_entities_by_similarity(entities, row["language"])
        for entities, row in zip(results, to_tag)
    ]

    # Step 5: write NER entities to DB
    item_model_map: dict[int, str] = {}
    for orig_i, _ in zhtw_indexed:
        item_model_map[orig_i] = _ckip_model_display_name()
    for orig_i, _ in other_indexed:
        item_model_map[orig_i] = _spacy_model_display_name()

    for i, (row, entities) in enumerate(zip(to_tag, results)):
        await database.update_item_ner(
            item_id=str(row["id"]),
            entities=entities,
            model=item_model_map[i],
        )

    logger.info("ner: tagged %d item(s)", len(to_tag))
    return {
        "status": "success",
        "items_fetched": len(items),
        "items_tagged": len(to_tag),
        "items_skipped": len(to_skip),
        "model_name": "+".join(sorted(models_used)) if models_used else None,
    }
