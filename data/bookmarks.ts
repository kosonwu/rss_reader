import { db } from "@/db";
import { feedItems, feeds, userBookmarks, userReadItems } from "@/db/schema";
import { and, count, desc, eq, sql } from "drizzle-orm";

export async function getUserBookmarksCount(userId: string): Promise<number> {
  const [row] = await db
    .select({ count: count() })
    .from(userBookmarks)
    .where(eq(userBookmarks.userId, userId));
  return row?.count ?? 0;
}

export async function getUserBookmarks(userId: string) {
  return db
    .select({
      id: feedItems.id,
      feedId: feedItems.feedId,
      title: feedItems.title,
      description: feedItems.description,
      url: feedItems.url,
      ogImageUrl: feedItems.ogImageUrl,
      publishedAt: feedItems.publishedAt,
      bookmarkedAt: userBookmarks.bookmarkedAt,
      isRead: sql<boolean>`${userReadItems.id} IS NOT NULL`.as("is_read"),
    })
    .from(userBookmarks)
    .innerJoin(feedItems, eq(feedItems.id, userBookmarks.feedItemId))
    .innerJoin(feeds, eq(feeds.id, feedItems.feedId))
    .leftJoin(
      userReadItems,
      and(eq(userReadItems.feedItemId, feedItems.id), eq(userReadItems.userId, userId)),
    )
    .where(eq(userBookmarks.userId, userId))
    .orderBy(desc(userBookmarks.bookmarkedAt));
}

export async function addBookmark(userId: string, feedItemId: string) {
  return db.insert(userBookmarks).values({ userId, feedItemId }).onConflictDoNothing();
}

export async function removeBookmark(userId: string, feedItemId: string) {
  return db
    .delete(userBookmarks)
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
