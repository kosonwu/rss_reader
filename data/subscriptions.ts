import { db } from "@/db";
import { feeds, userSubscriptions } from "@/db/schema";
import { and, asc, count, eq, notInArray } from "drizzle-orm";

export async function getUserSubscriptions(userId: string) {
  return db
    .select({
      id: userSubscriptions.id,
      feedId: userSubscriptions.feedId,
      displayName: userSubscriptions.displayName,
      isActive: userSubscriptions.isActive,
      subscribedAt: userSubscriptions.subscribedAt,
      feedTitle: feeds.title,
      feedUrl: feeds.url,
      feedSiteUrl: feeds.siteUrl,
      feedDescription: feeds.description,
    })
    .from(userSubscriptions)
    .innerJoin(feeds, eq(feeds.id, userSubscriptions.feedId))
    .where(eq(userSubscriptions.userId, userId))
    .orderBy(asc(userSubscriptions.displayName), asc(feeds.title));
}

export async function getSubscriptionsCount(userId: string) {
  const [result] = await db
    .select({ value: count() })
    .from(userSubscriptions)
    .where(eq(userSubscriptions.userId, userId));
  return result?.value ?? 0;
}

export async function getAvailableFeeds(userId: string) {
  const subscribed = await db
    .select({ feedId: userSubscriptions.feedId })
    .from(userSubscriptions)
    .where(eq(userSubscriptions.userId, userId));

  const subscribedIds = subscribed.map((s) => s.feedId);

  const query = db
    .select({ id: feeds.id, title: feeds.title, url: feeds.url })
    .from(feeds);

  if (subscribedIds.length > 0) {
    return query.where(notInArray(feeds.id, subscribedIds));
  }

  return query;
}

export async function subscribeToFeed(
  userId: string,
  feedId: string,
  fields?: { displayName?: string | null; isActive?: boolean },
) {
  await db
    .insert(userSubscriptions)
    .values({ userId, feedId, ...fields })
    .onConflictDoNothing();
}

export async function unsubscribeFromFeed(userId: string, subscriptionId: string) {
  await db
    .delete(userSubscriptions)
    .where(
      and(
        eq(userSubscriptions.id, subscriptionId),
        eq(userSubscriptions.userId, userId),
      ),
    );
}

export async function updateSubscription(
  userId: string,
  subscriptionId: string,
  fields: { displayName: string | null; isActive: boolean },
) {
  await db
    .update(userSubscriptions)
    .set(fields)
    .where(
      and(
        eq(userSubscriptions.id, subscriptionId),
        eq(userSubscriptions.userId, userId),
      ),
    );
}
