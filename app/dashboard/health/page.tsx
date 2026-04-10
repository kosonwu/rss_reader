import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { getAllFeedsDetailed } from "@/data/feeds"
import { getSubscriptionsCount } from "@/data/subscriptions"
import { getUserKeywords } from "@/data/keywords"
import HealthClient from "./_components/health-client"

export default async function HealthPage() {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")

  const [allFeeds, subscriptionsCount, keywords] = await Promise.all([
    getAllFeedsDetailed(),
    getSubscriptionsCount(userId),
    getUserKeywords(userId),
  ])

  return (
    <HealthClient
      feedsCount={allFeeds.length}
      subscriptionsCount={subscriptionsCount}
      keywordsCount={keywords.length}
    />
  )
}
