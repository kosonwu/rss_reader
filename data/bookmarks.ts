import { db } from "@/db";
import { feedItems, feeds, userBookmarks, userReadItems, userSubscriptions } from "@/db/schema";
import { and, count, desc, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { startOfDay, endOfDay } from "date-fns";
import { resolveCanonicalTexts } from "@/data/entity-tags";

export async function getUserBookmarksCount(userId: string): Promise<number> {
  const [row] = await db
    .select({ count: count() })
    .from(userBookmarks)
    .where(and(eq(userBookmarks.userId, userId), isNull(userBookmarks.removedAt)));
  return row?.count ?? 0;
}

export async function getUserBookmarks(userId: string) {
  const rows = await db
    .select({
      id: feedItems.id,
      feedId: feedItems.feedId,
      title: feedItems.title,
      description: feedItems.description,
      url: feedItems.url,
      ogImageUrl: feedItems.ogImageUrl,
      publishedAt: feedItems.publishedAt,
      bookmarkedAt: userBookmarks.bookmarkedAt,
      displayTags: feedItems.displayTags,
      readingTimeMinutes: feedItems.readingTimeMinutes,
      isRead: sql<boolean>`${userReadItems.id} IS NOT NULL`.as("is_read"),
    })
    .from(userBookmarks)
    .innerJoin(feedItems, eq(feedItems.id, userBookmarks.feedItemId))
    .innerJoin(feeds, eq(feeds.id, feedItems.feedId))
    .leftJoin(
      userReadItems,
      and(eq(userReadItems.feedItemId, feedItems.id), eq(userReadItems.userId, userId)),
    )
    .where(and(eq(userBookmarks.userId, userId), isNull(userBookmarks.removedAt)))
    .orderBy(desc(userBookmarks.bookmarkedAt));

  const allTagsLower = [...new Set(
    rows.flatMap(r => (r.displayTags ?? []).map(t => t.toLowerCase()))
  )]
  const canonicalMap = await resolveCanonicalTexts(allTagsLower)

  return rows.map(r => ({
    ...r,
    displayTags: r.displayTags?.map(t => canonicalMap.get(t.toLowerCase())?.text ?? t) ?? null,
  }))
}

export async function addBookmark(userId: string, feedItemId: string) {
  return db
    .insert(userBookmarks)
    .values({ userId, feedItemId })
    .onConflictDoUpdate({
      target: [userBookmarks.userId, userBookmarks.feedItemId],
      set: { removedAt: null },
    });
}

export async function bulkAddBookmarksByTag(
  userId: string,
  tag: string,
  dateFrom: Date,
  dateTo: Date,
): Promise<number> {
  const itemIds = await db
    .selectDistinct({ id: feedItems.id })
    .from(feedItems)
    .innerJoin(feeds, eq(feeds.id, feedItems.feedId))
    .innerJoin(userSubscriptions, eq(userSubscriptions.feedId, feeds.id))
    .where(
      and(
        eq(userSubscriptions.userId, userId),
        eq(userSubscriptions.isActive, true),
        gte(feedItems.publishedAt, startOfDay(dateFrom)),
        lte(feedItems.publishedAt, endOfDay(dateTo)),
        sql`lower(${tag}) = ANY(SELECT lower(unnest(${feedItems.displayTags})))`
      )
    )

  if (itemIds.length === 0) return 0

  const inserted = await db
    .insert(userBookmarks)
    .values(itemIds.map(({ id }) => ({ userId, feedItemId: id })))
    .onConflictDoUpdate({
      target: [userBookmarks.userId, userBookmarks.feedItemId],
      set: { removedAt: null },
    })
    .returning({ id: userBookmarks.id })

  return inserted.length
}

export async function removeBookmark(userId: string, feedItemId: string) {
  return db
    .update(userBookmarks)
    .set({ removedAt: new Date() })
    .where(and(eq(userBookmarks.userId, userId), eq(userBookmarks.feedItemId, feedItemId)));
}

export async function markItemAsRead(userId: string, feedItemId: string) {
  return db.insert(userReadItems).values({ userId, feedItemId }).onConflictDoNothing();
}

export async function markItemAsUnread(userId: string, feedItemId: string) {
  return db
    .delete(userReadItems)
    .where(and(eq(userReadItems.userId, userId), eq(userReadItems.feedItemId, feedItemId)));
}
