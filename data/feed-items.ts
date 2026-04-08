import { db } from "@/db";
import { feedItems, feeds, userSubscriptions } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

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
    .where(eq(userSubscriptions.userId, userId))
    .orderBy(desc(feedItems.publishedAt));
}
