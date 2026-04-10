import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getUserFetchLogs } from "@/data/fetch-logs";
import { getAllFeedsDetailed } from "@/data/feeds";
import { getSubscriptionsCount } from "@/data/subscriptions";
import { getUserKeywords } from "@/data/keywords";
import FetchLogsClient from "./_components/fetch-logs-client";

export default async function FetchLogsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [logs, allFeeds, subscriptionsCount, keywords] = await Promise.all([
    getUserFetchLogs(userId),
    getAllFeedsDetailed(),
    getSubscriptionsCount(userId),
    getUserKeywords(userId),
  ]);

  const serializedLogs = logs.map((log) => ({
    ...log,
    runAt: log.runAt.toISOString(),
  }));

  return (
    <FetchLogsClient
      logs={serializedLogs}
      feedsCount={allFeeds.length}
      subscriptionsCount={subscriptionsCount}
      keywordsCount={keywords.length}
    />
  );
}
