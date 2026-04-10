import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getUserKeywords } from "@/data/keywords";
import { getAllFeedsDetailed } from "@/data/feeds";
import { getSubscriptionsCount } from "@/data/subscriptions";
import KeywordsClient from "./_components/keywords-client";

export default async function KeywordsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [keywords, allFeeds, subscriptionsCount] = await Promise.all([
    getUserKeywords(userId),
    getAllFeedsDetailed(),
    getSubscriptionsCount(userId),
  ]);

  return (
    <KeywordsClient
      keywords={keywords}
      feedsCount={allFeeds.length}
      subscriptionsCount={subscriptionsCount}
      keywordsCount={keywords.length}
    />
  );
}
