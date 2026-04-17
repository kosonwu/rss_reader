import { db } from "@/db";
import { feedItems, feeds, userSubscriptions, userReadItems, userBookmarks } from "@/db/schema";
import { and, count, desc, eq, gte, ilike, like, lte, sql } from "drizzle-orm";
import { startOfDay, endOfDay } from "date-fns";
import { resolveCanonicalTexts } from "@/data/entity-tags";

export const PAGE_SIZE = 66

export type FeedItemFilters = {
  dateFrom: Date
  dateTo: Date
  feedId?: string
  keyword?: string
  keywordCaseSensitive?: boolean
  tag?: string
  sort?: "date" | "preference"
  tasteVector?: number[]
}

export type PaginatedFeedItemsResult = {
  items: ReturnType<typeof serialize>[]
  totalCount: number
}

function serialize(item: {
  id: string
  feedId: string
  title: string | null
  description: string | null
  content: string | null
  url: string | null
  ogImageUrl: string | null
  publishedAt: Date | null
  displayTags: string[] | null
  readingTimeMinutes: number
  isRead: boolean
  isBookmarked: boolean
}) {
  return {
    ...item,
    publishedAt: item.publishedAt?.toISOString() ?? null,
    isRead: Boolean(item.isRead),
    isBookmarked: Boolean(item.isBookmarked),
  }
}

function buildConditions(userId: string, filters: FeedItemFilters) {
  const conditions = [
    eq(userSubscriptions.userId, userId),
    eq(userSubscriptions.isActive, true),
    sql`${feedItems.displayTagsUpdatedAt} IS NOT NULL`,
    gte(feedItems.publishedAt, startOfDay(filters.dateFrom)),
    lte(feedItems.publishedAt, endOfDay(filters.dateTo)),
  ]

  if (filters.feedId) {
    conditions.push(eq(feedItems.feedId, filters.feedId))
  }

  if (filters.keyword) {
    const pattern = `%${filters.keyword}%`
    if (filters.keywordCaseSensitive) {
      conditions.push(
        sql`(${feedItems.title} LIKE ${pattern} OR ${feedItems.description} LIKE ${pattern} OR ${feedItems.content} LIKE ${pattern})`
      )
    } else {
      conditions.push(
        sql`(${feedItems.title} ILIKE ${pattern} OR ${feedItems.description} ILIKE ${pattern} OR ${feedItems.content} ILIKE ${pattern})`
      )
    }
  }

  if (filters.tag) {
    conditions.push(
      sql`${feedItems.displayTags} IS NOT NULL AND lower(${filters.tag}) = ANY(SELECT lower(unnest(${feedItems.displayTags})))`
    )
  }

  return and(...conditions)
}

export async function getUserFeedItems(
  userId: string,
  filters: FeedItemFilters,
  page: number,
  pageSize: number = PAGE_SIZE,
): Promise<PaginatedFeedItemsResult> {
  const usePreferenceSort =
    filters.sort === "preference" &&
    Array.isArray(filters.tasteVector) &&
    filters.tasteVector.length === 384

  let where = buildConditions(userId, filters)
  if (usePreferenceSort) {
    where = and(where, sql`${feedItems.embeddingContent} IS NOT NULL`)
  }

  const offset = (page - 1) * pageSize

  const [itemRows, countRows] = await Promise.all([
    db
      .select({
        id: feedItems.id,
        feedId: feedItems.feedId,
        title: feedItems.title,
        description: feedItems.description,
        content: feedItems.content,
        url: feedItems.url,
        ogImageUrl: feedItems.ogImageUrl,
        publishedAt: feedItems.publishedAt,
        displayTags: feedItems.displayTags,
        readingTimeMinutes: feedItems.readingTimeMinutes,
        isRead: sql<boolean>`${userReadItems.id} IS NOT NULL`.as("is_read"),
        isBookmarked: sql<boolean>`${userBookmarks.id} IS NOT NULL`.as("is_bookmarked"),
      })
      .from(feedItems)
      .innerJoin(feeds, eq(feeds.id, feedItems.feedId))
      .innerJoin(userSubscriptions, eq(userSubscriptions.feedId, feeds.id))
      .leftJoin(
        userReadItems,
        and(eq(userReadItems.feedItemId, feedItems.id), eq(userReadItems.userId, userId)),
      )
      .leftJoin(
        userBookmarks,
        and(eq(userBookmarks.feedItemId, feedItems.id), eq(userBookmarks.userId, userId)),
      )
      .where(where)
      .orderBy(
        usePreferenceSort
          ? sql`${feedItems.embeddingContent} <=> ${JSON.stringify(filters.tasteVector)}::vector`
          : desc(feedItems.publishedAt)
      )
      .limit(pageSize)
      .offset(offset),

    db
      .select({ total: count() })
      .from(feedItems)
      .innerJoin(feeds, eq(feeds.id, feedItems.feedId))
      .innerJoin(userSubscriptions, eq(userSubscriptions.feedId, feeds.id))
      .where(where),
  ])

  // Resolve canonical casing for displayTags (same approach as hot_topics page)
  const allTagsLower = [...new Set(
    itemRows.flatMap(item => (item.displayTags ?? []).map(t => t.toLowerCase()))
  )]
  const canonicalMap = await resolveCanonicalTexts(allTagsLower)

  return {
    items: itemRows.map(item => serialize({
      ...item,
      displayTags: item.displayTags?.map(t => canonicalMap.get(t.toLowerCase())?.text ?? t) ?? null,
    })),
    totalCount: countRows[0]?.total ?? 0,
  }
}

export async function getUserFeedItemsCount(userId: string): Promise<number> {
  const result = await db
    .select({ count: count() })
    .from(feedItems)
    .innerJoin(feeds, eq(feeds.id, feedItems.feedId))
    .innerJoin(userSubscriptions, eq(userSubscriptions.feedId, feeds.id))
    .where(and(
      eq(userSubscriptions.userId, userId),
      eq(userSubscriptions.isActive, true),
      sql`${feedItems.displayTagsUpdatedAt} IS NOT NULL`,
    ));
  return result[0]?.count ?? 0;
}
