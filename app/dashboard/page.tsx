import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { getUserFeeds, getAllFeedsDetailed } from "@/data/feeds"
import { getUserFeedItems } from "@/data/feed-items"
import { getUserKeywords } from "@/data/keywords"
import { getSubscriptionsCount } from "@/data/subscriptions"
import DashboardClient from "./_components/dashboard-client"

function calcReadingTime(content: string | null): number {
  if (!content) return 1
  const chineseChars = (content.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) ?? []).length
  const withoutChinese = content.replace(/[\u4e00-\u9fff\u3400-\u4dbf]/g, " ")
  const englishWords = withoutChinese.trim().split(/\s+/).filter(Boolean).length
  const minutes = chineseChars / 400 + englishWords / 200
  return Math.max(1, Math.ceil(minutes))
}

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
    content: undefined,
    publishedAt: item.publishedAt?.toISOString() ?? null,
    isRead: Boolean(item.isRead),
    isBookmarked: Boolean(item.isBookmarked),
    readingTimeMinutes: calcReadingTime(item.content),
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
