import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { getUserFeeds, getAllFeedsDetailed } from "@/data/feeds"
import { getUserFeedItems } from "@/data/feed-items"
import { getUserKeywords } from "@/data/keywords"
import { getSubscriptionsCount } from "@/data/subscriptions"
import DashboardClient from "./_components/dashboard-client"

export default async function DashboardPage() {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")

  const [feeds, allFeeds, feedItems, keywords, subscriptionsCount] = await Promise.all([
    getUserFeeds(userId),
    getAllFeedsDetailed(),
    getUserFeedItems(userId),
    getUserKeywords(userId),
    getSubscriptionsCount(userId),
  ])

  // Serialize Date objects before crossing the Server → Client boundary
  const serializedFeedItems = feedItems.map((item) => ({
    ...item,
    publishedAt: item.publishedAt?.toISOString() ?? null,
  }))

  return (
    <DashboardClient
      feeds={feeds}
      feedsCount={allFeeds.length}
      feedItems={serializedFeedItems}
      keywords={keywords}
      subscriptionsCount={subscriptionsCount}
    />
  )
}
