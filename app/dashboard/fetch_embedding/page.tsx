import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getEmbeddingLogs } from "@/data/fetch-embedding-logs";
import { getAllFeedsDetailed } from "@/data/feeds";
import { getSubscriptionsCount } from "@/data/subscriptions";
import { getUserKeywords } from "@/data/keywords";
import { getUserBookmarksCount } from "@/data/bookmarks";
import FetchEmbeddingLogsClient from "./_components/fetch-embedding-logs-client";

export default async function FetchEmbeddingLogsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [logs, allFeeds, subscriptionsCount, keywords, bookmarksCount] = await Promise.all([
    getEmbeddingLogs(),
    getAllFeedsDetailed(),
    getSubscriptionsCount(userId),
    getUserKeywords(userId),
    getUserBookmarksCount(userId),
  ]);

  const serializedLogs = logs.map((log) => ({
    ...log,
    runAt: log.runAt.toISOString(),
  }));

  return (
    <FetchEmbeddingLogsClient
      logs={serializedLogs}
      feedsCount={allFeeds.length}
      subscriptionsCount={subscriptionsCount}
      keywordsCount={keywords.length}
      bookmarksCount={bookmarksCount}
    />
  );
}
