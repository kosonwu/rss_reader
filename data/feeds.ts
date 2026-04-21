import { db } from "@/db";
import { feeds, userSubscriptions } from "@/db/schema";
import { and, asc, count, eq } from "drizzle-orm";

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

export async function getAllFeedsDetailed() {
  return db
    .select({
      id: feeds.id,
      title: feeds.title,
      description: feeds.description,
      url: feeds.url,
      siteUrl: feeds.siteUrl,
      fetchStatus: feeds.fetchStatus,
      fetchIntervalMinutes: feeds.fetchIntervalMinutes,
      lastFetchedAt: feeds.lastFetchedAt,
      lastFetchError: feeds.lastFetchError,
      language: feeds.language,
      userId: feeds.userId,
      createdAt: feeds.createdAt,
    })
    .from(feeds)
    .orderBy(asc(feeds.title));
}

export async function getAllFeedsCount(): Promise<number> {
  const [row] = await db.select({ count: count() }).from(feeds)
  return row?.count ?? 0
}

export type FeedStatusCounts = {
  active: number
  error: number
  pending: number
  paused: number
  total: number
}

export async function getAllFeedsStatusCounts(): Promise<FeedStatusCounts> {
  const rows = await db
    .select({ status: feeds.fetchStatus, count: count() })
    .from(feeds)
    .groupBy(feeds.fetchStatus)

  const result: FeedStatusCounts = { active: 0, error: 0, pending: 0, paused: 0, total: 0 }
  for (const row of rows) {
    const n = Number(row.count)
    result[row.status] += n
    result.total += n
  }
  return result
}

export type FeedFields = {
  title: string | null;
  description: string | null;
  siteUrl: string | null;
  fetchStatus: "pending" | "active" | "error" | "paused";
  fetchIntervalMinutes: number;
  language: "en" | "zh-TW" | null;
};

export async function addFeed(url: string, fields: FeedFields, userId?: string) {
  const [inserted] = await db
    .insert(feeds)
    .values({ url, ...fields, userId: userId ?? null })
    .onConflictDoNothing()
    .returning({ id: feeds.id });

  const feedId =
    inserted?.id ??
    (await db.select({ id: feeds.id }).from(feeds).where(eq(feeds.url, url)))[0].id;

  return { feedId };
}

export async function removeFeed(feedId: string) {
  return db
    .delete(feeds)
    .where(eq(feeds.id, feedId));
}

export async function updateFeed(feedId: string, fields: FeedFields) {
  const [updated] = await db
    .update(feeds)
    .set(fields)
    .where(eq(feeds.id, feedId))
    .returning({ id: feeds.id });

  if (!updated) throw new Error("Feed not found");
}
