import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getUserSubscriptions, getAvailableFeeds } from "@/data/subscriptions";
import { getAllFeedsDetailed } from "@/data/feeds";
import { getUserKeywords } from "@/data/keywords";
import { getUserBookmarksCount } from "@/data/bookmarks";
import SubscriptionsClient from "./_components/subscriptions-client";

export default async function SubscriptionsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [subscriptions, availableFeeds, allFeeds, keywords, bookmarksCount] = await Promise.all([
    getUserSubscriptions(userId),
    getAvailableFeeds(userId),
    getAllFeedsDetailed(),
    getUserKeywords(userId),
    getUserBookmarksCount(userId),
  ]);

  const serializedSubscriptions = subscriptions.map((s) => ({
    ...s,
    subscribedAt: s.subscribedAt.toISOString(),
  }));

  return (
    <SubscriptionsClient
      subscriptions={serializedSubscriptions}
      availableFeeds={availableFeeds}
      feedsCount={allFeeds.length}
      subscriptionsCount={subscriptions.length}
      keywordsCount={keywords.length}
      bookmarksCount={bookmarksCount}
    />
  );
}
