import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getAllFeedsDetailed } from "@/data/feeds";
import { getSubscriptionsCount } from "@/data/subscriptions";
import { getUserKeywords } from "@/data/keywords";
import { getUserBookmarksCount } from "@/data/bookmarks";
import FeedsClient from "./_components/feeds-client";

export default async function FeedsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [feeds, subscriptionsCount, keywords, bookmarksCount] = await Promise.all([
    getAllFeedsDetailed(),
    getSubscriptionsCount(userId),
    getUserKeywords(userId),
    getUserBookmarksCount(userId),
  ]);

  const serializedFeeds = feeds.map((feed) => ({
    ...feed,
    lastFetchedAt: feed.lastFetchedAt?.toISOString() ?? null,
    createdAt: feed.createdAt.toISOString(),
  }));

  return (
    <FeedsClient
      feeds={serializedFeeds}
      feedsCount={feeds.length}
      subscriptionsCount={subscriptionsCount}
      keywordsCount={keywords.length}
      bookmarksCount={bookmarksCount}
    />
  );
}
