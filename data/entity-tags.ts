import { db } from "@/db";
import { entityTagIndex } from "@/db/schema";
import { and, count, desc, gte, inArray, lte } from "drizzle-orm";
import { format, startOfDay, endOfDay, subDays } from "date-fns";

export type HotTopic = {
  entityText: string;
  entityTextLower: string;
  entityType: string;
  currentCount: number;
  previousCount: number;
  changePercent: number | null;
};

export type TrendPoint = {
  date: string; // "yyyy-MM-dd"
  entityTextLower: string;
  entityText: string;
  count: number;
};

// ── Period helpers ──────────────────────────────────────────────────────────────

type PeriodBounds = {
  currentStart: Date;
  currentEnd: Date;
  previousStart: Date;
  previousEnd: Date;
};

function getPeriodBounds(period: "today" | "week" | "month", now: Date): PeriodBounds {
  if (period === "today") {
    return {
      currentStart: startOfDay(now),
      currentEnd: endOfDay(now),
      previousStart: startOfDay(subDays(now, 1)),
      previousEnd: endOfDay(subDays(now, 1)),
    };
  }
  if (period === "week") {
    return {
      currentStart: startOfDay(subDays(now, 6)),
      currentEnd: endOfDay(now),
      previousStart: startOfDay(subDays(now, 13)),
      previousEnd: endOfDay(subDays(now, 7)),
    };
  }
  // month
  return {
    currentStart: startOfDay(subDays(now, 29)),
    currentEnd: endOfDay(now),
    previousStart: startOfDay(subDays(now, 59)),
    previousEnd: endOfDay(subDays(now, 30)),
  };
}

// ── Canonical text resolver ─────────────────────────────────────────────────────
//
// For each entityTextLower, picks the entityText variant with the highest
// occurrence count across ALL time. This gives "Google" over "google" because
// correctly-cased forms dominate in real article data.

export async function resolveCanonicalTexts(
  entityTextsLower: string[],
): Promise<Map<string, { text: string; type: string }>> {
  if (entityTextsLower.length === 0) return new Map();

  const rows = await db
    .select({
      entityTextLower: entityTagIndex.entityTextLower,
      entityText: entityTagIndex.entityText,
      entityType: entityTagIndex.entityType,
      cnt: count(entityTagIndex.id),
    })
    .from(entityTagIndex)
    .where(inArray(entityTagIndex.entityTextLower, entityTextsLower))
    .groupBy(
      entityTagIndex.entityTextLower,
      entityTagIndex.entityText,
      entityTagIndex.entityType,
    );

  // For each lower-cased key, pick the best (text, type) pair using a three-tier rule:
  //   Tier 1 — NER entries (type ≠ "tags") beat KeyBERT tag entries: NER extracts the
  //            actual entity text from the article and preserves its casing, while old
  //            KeyBERT data was stored all-lowercase before the lowercase=False fix.
  //   Tier 2 — Same source tier: higher occurrence count wins.
  //   Tier 3 — Same count: prefer mixed/upper-case forms over all-lowercase
  //            (e.g. "GTC" beats "gtc") to surface the correctly-cased form.
  const best = new Map<string, { text: string; type: string; cnt: number }>();
  for (const row of rows) {
    const current = best.get(row.entityTextLower);

    if (!current) {
      best.set(row.entityTextLower, { text: row.entityText, type: row.entityType, cnt: row.cnt });
      continue;
    }

    const rowIsNer = row.entityType !== "tags";
    const currentIsNer = current.type !== "tags";

    // Tier 1: NER beats KeyBERT
    if (rowIsNer && !currentIsNer) {
      best.set(row.entityTextLower, { text: row.entityText, type: row.entityType, cnt: row.cnt });
      continue;
    }
    if (currentIsNer && !rowIsNer) continue;

    // Tier 2: same tier — higher count wins
    if (row.cnt > current.cnt) {
      best.set(row.entityTextLower, { text: row.entityText, type: row.entityType, cnt: row.cnt });
      continue;
    }

    // Tier 3: same count — prefer forms with uppercase letters over all-lowercase
    if (row.cnt === current.cnt) {
      const rowHasCase = row.entityText !== row.entityText.toLowerCase();
      const currentHasCase = current.text !== current.text.toLowerCase();
      if (rowHasCase && !currentHasCase) {
        best.set(row.entityTextLower, { text: row.entityText, type: row.entityType, cnt: row.cnt });
      }
    }
  }

  return new Map(
    Array.from(best.entries()).map(([lower, v]) => [lower, { text: v.text, type: v.type }]),
  );
}

// ── Queries ─────────────────────────────────────────────────────────────────────

export async function getHotTopics(
  period: "today" | "week" | "month",
  limit = 20,
): Promise<HotTopic[]> {
  const now = new Date();
  const { currentStart, currentEnd, previousStart, previousEnd } = getPeriodBounds(period, now);

  const mentionCount = count(entityTagIndex.id);

  const [currentRows, previousRows] = await Promise.all([
    db
      .select({
        entityTextLower: entityTagIndex.entityTextLower,
        mentionCount,
      })
      .from(entityTagIndex)
      .where(
        and(
          gte(entityTagIndex.publishedAt, currentStart),
          lte(entityTagIndex.publishedAt, currentEnd),
        ),
      )
      .groupBy(entityTagIndex.entityTextLower)
      .orderBy(desc(mentionCount))
      .limit(limit),

    db
      .select({
        entityTextLower: entityTagIndex.entityTextLower,
        mentionCount,
      })
      .from(entityTagIndex)
      .where(
        and(
          gte(entityTagIndex.publishedAt, previousStart),
          lte(entityTagIndex.publishedAt, previousEnd),
        ),
      )
      .groupBy(entityTagIndex.entityTextLower),
  ]);

  // Resolve canonical display text for the top entities
  const canonicalMap = await resolveCanonicalTexts(
    currentRows.map((r) => r.entityTextLower),
  );

  const prevMap = new Map(previousRows.map((r) => [r.entityTextLower, r.mentionCount]));

  return currentRows.map((r) => {
    const canonical = canonicalMap.get(r.entityTextLower);
    const prevCount = prevMap.get(r.entityTextLower) ?? 0;
    const changePercent =
      prevCount > 0 ? Math.round(((r.mentionCount - prevCount) / prevCount) * 100) : null;
    return {
      entityText: canonical?.text ?? r.entityTextLower,
      entityTextLower: r.entityTextLower,
      entityType: canonical?.type ?? "tags",
      currentCount: r.mentionCount,
      previousCount: prevCount,
      changePercent,
    };
  });
}

export async function getEntityTrendData(
  entityTextsLower: string[],
  days: number,
): Promise<TrendPoint[]> {
  if (entityTextsLower.length === 0) return [];

  const since = startOfDay(subDays(new Date(), days - 1));

  const rows = await db
    .select({
      entityTextLower: entityTagIndex.entityTextLower,
      publishedAt: entityTagIndex.publishedAt,
    })
    .from(entityTagIndex)
    .where(
      and(
        inArray(entityTagIndex.entityTextLower, entityTextsLower),
        gte(entityTagIndex.publishedAt, since),
      ),
    );

  // Resolve canonical display text for chart labels
  const canonicalMap = await resolveCanonicalTexts(entityTextsLower);

  // Group by day + entity in JS to avoid raw SQL DATE_TRUNC
  const grouped = new Map<string, Map<string, number>>();

  for (const row of rows) {
    if (!row.publishedAt) continue;
    const dayKey = format(row.publishedAt, "yyyy-MM-dd");
    if (!grouped.has(dayKey)) grouped.set(dayKey, new Map());
    const entityMap = grouped.get(dayKey)!;
    entityMap.set(row.entityTextLower, (entityMap.get(row.entityTextLower) ?? 0) + 1);
  }

  const result: TrendPoint[] = [];
  for (const [date, entityMap] of grouped) {
    for (const [entityTextLower, cnt] of entityMap) {
      result.push({
        date,
        entityTextLower,
        entityText: canonicalMap.get(entityTextLower)?.text ?? entityTextLower,
        count: cnt,
      });
    }
  }

  return result.sort((a, b) => a.date.localeCompare(b.date));
}
