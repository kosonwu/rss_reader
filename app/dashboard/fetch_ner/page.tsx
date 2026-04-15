import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getNerLogs } from "@/data/fetch-ner-logs";
import { getAllFeedsDetailed } from "@/data/feeds";
import { getSubscriptionsCount } from "@/data/subscriptions";
import { getUserKeywords } from "@/data/keywords";
import { getUserBookmarksCount } from "@/data/bookmarks";
import FetchNerLogsClient from "./_components/fetch-ner-logs-client";

export default async function FetchNerLogsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [logs, allFeeds, subscriptionsCount, keywords, bookmarksCount] = await Promise.all([
    getNerLogs(),
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
    <FetchNerLogsClient
      logs={serializedLogs}
      feedsCount={allFeeds.length}
      subscriptionsCount={subscriptionsCount}
      keywordsCount={keywords.length}
      bookmarksCount={bookmarksCount}
    />
  );
}
