import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getUserKeywords } from "@/data/keywords";
import { getAllFeedsDetailed } from "@/data/feeds";
import { getSubscriptionsCount } from "@/data/subscriptions";
import { getUserBookmarksCount } from "@/data/bookmarks";
import KeywordsClient from "./_components/keywords-client";

export default async function KeywordsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [keywords, allFeeds, subscriptionsCount, bookmarksCount] = await Promise.all([
    getUserKeywords(userId),
    getAllFeedsDetailed(),
    getSubscriptionsCount(userId),
    getUserBookmarksCount(userId),
  ]);

  return (
    <KeywordsClient
      keywords={keywords}
      feedsCount={allFeeds.length}
      subscriptionsCount={subscriptionsCount}
      keywordsCount={keywords.length}
      bookmarksCount={bookmarksCount}
    />
  );
}
