import { db } from "@/db";
import { feeds, userSubscriptions } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function getUserFeeds(userId: string) {
  return db
    .select({
      id: feeds.id,
      title: feeds.title,
      url: feeds.url,
    })
    .from(feeds)
    .innerJoin(userSubscriptions, eq(userSubscriptions.feedId, feeds.id))
    .where(
      and(
        eq(userSubscriptions.userId, userId),
        eq(userSubscriptions.isActive, true),
      ),
    );
}
