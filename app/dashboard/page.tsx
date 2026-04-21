import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { format, isValid, parseISO, startOfDay } from "date-fns"
import { getUserFeeds, getAllFeedsCount, getAllFeedsStatusCounts } from "@/data/feeds"
import type { FeedStatusCounts } from "@/data/feeds"
import { getUserFeedItems, PAGE_SIZE } from "@/data/feed-items"
import { getUserKeywords } from "@/data/keywords"
import { getSubscriptionsCount } from "@/data/subscriptions"
import { getUserBookmarksCount } from "@/data/bookmarks"
import { getUserProfile } from "@/data/user-profiles"
import DashboardClient from "./_components/dashboard-client"

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")

  const params = await searchParams

  // Parse URL params
  const todayStr = format(new Date(), "yyyy-MM-dd")
  const fromStr = typeof params.from === "string" ? params.from : todayStr
  const toStr   = typeof params.to   === "string" ? params.to   : todayStr

  const dateFrom = parseISO(fromStr)
  const dateTo   = parseISO(toStr)

  const isInvalidDateRange =
    !isValid(dateFrom) || !isValid(dateTo) ||
    startOfDay(dateFrom) > startOfDay(dateTo)

  const feedIdParam  = typeof params.feed    === "string" ? params.feed    : undefined
  const keywordParam = typeof params.keyword === "string" ? params.keyword : undefined
  const tagParam     = typeof params.tag     === "string" ? params.tag     : undefined
  const page         = typeof params.page    === "string" ? Math.max(1, parseInt(params.page, 10) || 1) : 1
  const sortParam    = params.sort === "preference" ? "preference" as const : "date" as const
  const searchQuery  = typeof params.q === "string" ? params.q.trim() : ""

  // Fetch metadata (always needed for filter dropdowns)
  const [feeds, feedsCount, feedsStatusCounts, keywords, subscriptionsCount, bookmarksCount, userProfile] = await Promise.all([
    getUserFeeds(userId),
    getAllFeedsCount(),
    getAllFeedsStatusCounts(),
    getUserKeywords(userId),
    getSubscriptionsCount(userId),
    getUserBookmarksCount(userId),
    getUserProfile(userId),
  ])

  const hasProfile =
    userProfile?.tasteVector != null &&
    (userProfile?.bookmarkCount ?? 0) > 0

  // Validate feedId and keyword against the user's actual data (security + integrity)
  const validFeedId  = feedIdParam && feeds.some(f => f.id === feedIdParam) ? feedIdParam : undefined
  const keywordObj   = keywordParam ? keywords.find(k => k.keyword === keywordParam) : undefined
  const validKeyword = keywordObj?.keyword
  const keywordCaseSensitive = keywordObj?.isCaseSensitive ?? false

  // Fetch paginated feed items (skip DB query for invalid date range)
  const feedItemsResult = isInvalidDateRange
    ? { items: [], totalCount: 0 }
    : await getUserFeedItems(
        userId,
        {
          dateFrom,
          dateTo,
          feedId: validFeedId,
          keyword: validKeyword,
          keywordCaseSensitive,
          tag: tagParam,
          sort: hasProfile ? sortParam : "date",
          tasteVector: hasProfile ? (userProfile?.tasteVector ?? undefined) : undefined,
        },
        page,
        PAGE_SIZE,
      )

  const totalPages  = Math.max(1, Math.ceil(feedItemsResult.totalCount / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)

  return (
    <DashboardClient
      feeds={feeds}
      feedsCount={feedsCount}
      feedsStatusCounts={feedsStatusCounts}
      keywords={keywords}
      subscriptionsCount={subscriptionsCount}
      bookmarksCount={bookmarksCount}
      feedItems={feedItemsResult.items}
      totalCount={feedItemsResult.totalCount}
      totalPages={totalPages}
      currentPage={currentPage}
      pageSize={PAGE_SIZE}
      dateFrom={fromStr}
      dateTo={toStr}
      selectedFeed={validFeedId ?? "all"}
      selectedKeyword={validKeyword ?? "all"}
      selectedTag={tagParam ?? null}
      isInvalidDateRange={isInvalidDateRange}
      sort={hasProfile ? sortParam : "date"}
      searchQuery={searchQuery}
    />
  )
}
