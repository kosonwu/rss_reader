import { db } from "@/db";
import { fetchLogs, feeds, userSubscriptions } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export async function getUserFetchLogs(userId: string) {
  return db
    .select({
      id: fetchLogs.id,
      feedId: fetchLogs.feedId,
      feedTitle: feeds.title,
      feedUrl: feeds.url,
      status: fetchLogs.status,
      articleCount: fetchLogs.articleCount,
      durationMs: fetchLogs.durationMs,
      errorMessage: fetchLogs.errorMessage,
      runAt: fetchLogs.runAt,
    })
    .from(fetchLogs)
    .innerJoin(feeds, eq(feeds.id, fetchLogs.feedId))
    .innerJoin(userSubscriptions, eq(userSubscriptions.feedId, feeds.id))
    .where(eq(userSubscriptions.userId, userId))
    .orderBy(desc(fetchLogs.runAt));
}
