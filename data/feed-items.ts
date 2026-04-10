import { db } from "@/db";
import { feedItems, feeds, userSubscriptions } from "@/db/schema";
import { and, count, desc, eq } from "drizzle-orm";

export async function getUserFeedItems(userId: string) {
  return db
    .select({
      id: feedItems.id,
      feedId: feedItems.feedId,
      title: feedItems.title,
      description: feedItems.description,
      url: feedItems.url,
      ogImageUrl: feedItems.ogImageUrl,
      publishedAt: feedItems.publishedAt,
    })
    .from(feedItems)
    .innerJoin(feeds, eq(feeds.id, feedItems.feedId))
    .innerJoin(userSubscriptions, eq(userSubscriptions.feedId, feeds.id))
    .where(and(eq(userSubscriptions.userId, userId), eq(userSubscriptions.isActive, true)))
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
