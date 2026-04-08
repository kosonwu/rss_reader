import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { getUserFeeds } from "@/data/feeds"
import { getUserFeedItems } from "@/data/feed-items"
import { getUserKeywords } from "@/data/keywords"
import DashboardClient from "./_components/dashboard-client"

export default async function DashboardPage() {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")

  const [feeds, feedItems, keywords] = await Promise.all([
    getUserFeeds(userId),
    getUserFeedItems(userId),
    getUserKeywords(userId),
  ])

  // Serialize Date objects before crossing the Server → Client boundary
  const serializedFeedItems = feedItems.map((item) => ({
    ...item,
    publishedAt: item.publishedAt?.toISOString() ?? null,
  }))

  return (
    <DashboardClient
      feeds={feeds}
      feedItems={serializedFeedItems}
      keywords={keywords}
    />
  )
}
