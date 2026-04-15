import { db } from "@/db";
import { feedItems, feeds, userSubscriptions, userReadItems, userBookmarks } from "@/db/schema";
import { and, count, desc, eq, gte, sql } from "drizzle-orm";

export async function getUserFeedItems(userId: string) {
  const since = new Date()
  since.setDate(since.getDate() - 30)

  return db
    .select({
      id: feedItems.id,
      feedId: feedItems.feedId,
      title: feedItems.title,
      description: feedItems.description,
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
    .where(and(
      eq(userSubscriptions.userId, userId),
      eq(userSubscriptions.isActive, true),
      gte(feedItems.publishedAt, since),
    ))
    .orderBy(desc(feedItems.publishedAt));
}

export async function getUserFeedItemsCount(userId: string): Promise<number> {
  const result = await db
    .select({ count: count() })
    .from(feedItems)
    .innerJoin(feeds, eq(feeds.id, feedItems.feedId))
    .innerJoin(userSubscriptions, eq(userSubscriptions.feedId, feeds.id))
    .where(and(eq(userSubscriptions.userId, userId), eq(userSubscriptions.isActive, true)));
  return result[0]?.count ?? 0;
}
