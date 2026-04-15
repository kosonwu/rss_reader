import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { getUserFeeds } from "@/data/feeds"
import { getAllFeedsCount } from "@/data/feeds"
import { getUserFeedItems } from "@/data/feed-items"
import { getUserKeywords } from "@/data/keywords"
import { getSubscriptionsCount } from "@/data/subscriptions"
import DashboardClient from "./_components/dashboard-client"

export default async function DashboardPage() {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")

  const [feeds, feedsCount, feedItems, keywords, subscriptionsCount] = await Promise.all([
    getUserFeeds(userId),
    getAllFeedsCount(),
    getUserFeedItems(userId),
    getUserKeywords(userId),
    getSubscriptionsCount(userId),
  ])

  const serializedFeedItems = feedItems.map((item) => ({
    ...item,
    publishedAt: item.publishedAt?.toISOString() ?? null,
    isRead: Boolean(item.isRead),
    isBookmarked: Boolean(item.isBookmarked),
  }))

  return (
    <DashboardClient
      feeds={feeds}
      feedsCount={feedsCount}
      feedItems={serializedFeedItems}
      keywords={keywords}
      subscriptionsCount={subscriptionsCount}
    />
  )
}
