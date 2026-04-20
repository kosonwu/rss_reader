import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getTagExtractionLogs } from "@/data/fetch-tag-extraction-logs";
import { getAllFeedsDetailed } from "@/data/feeds";
import { getSubscriptionsCount } from "@/data/subscriptions";
import { getUserKeywords } from "@/data/keywords";
import { getUserBookmarksCount } from "@/data/bookmarks";
import FetchTagExtractionLogsClient from "./_components/fetch-tag-extraction-logs-client";

export default async function FetchTagExtractionLogsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [logs, allFeeds, subscriptionsCount, keywords, bookmarksCount] = await Promise.all([
    getTagExtractionLogs(),
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
    <FetchTagExtractionLogsClient
      logs={serializedLogs}
      feedsCount={allFeeds.length}
      subscriptionsCount={subscriptionsCount}
      keywordsCount={keywords.length}
      bookmarksCount={bookmarksCount}
    />
  );
}
