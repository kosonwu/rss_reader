import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { getAllFeedsDetailed } from "@/data/feeds"
import { getSubscriptionsCount } from "@/data/subscriptions"
import { getUserKeywords } from "@/data/keywords"
import { getUserBookmarksCount } from "@/data/bookmarks"
import HealthClient from "./_components/health-client"

export default async function HealthPage() {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")

  const [allFeeds, subscriptionsCount, keywords, bookmarksCount] = await Promise.all([
    getAllFeedsDetailed(),
    getSubscriptionsCount(userId),
    getUserKeywords(userId),
    getUserBookmarksCount(userId),
  ])

  return (
    <HealthClient
      feedsCount={allFeeds.length}
      subscriptionsCount={subscriptionsCount}
      keywordsCount={keywords.length}
      bookmarksCount={bookmarksCount}
    />
  )
}
