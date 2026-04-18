import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getHotTopics, getEntityTrendData } from "@/data/entity-tags";
import { getAllFeedsCount } from "@/data/feeds";
import { getSubscriptionsCount } from "@/data/subscriptions";
import { getUserKeywords } from "@/data/keywords";
import { getUserBookmarksCount } from "@/data/bookmarks";
import HotTopicsClient from "./_components/hot-topics-client";

const CHART_ENTITIES = 5;

// Trend window per period
const TREND_DAYS = {
  today: 7,
  week: 30,
  month: 90,
} as const;

export default async function HotTopicsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [todayTopics, weekTopics, monthTopics, feedsCount, subscriptionsCount, keywords, bookmarksCount] =
    await Promise.all([
      getHotTopics("today", 20),
      getHotTopics("week", 20),
      getHotTopics("month", 20),
      getAllFeedsCount(),
      getSubscriptionsCount(userId),
      getUserKeywords(userId),
      getUserBookmarksCount(userId),
    ]);

  // Fetch trend data for each period's top 5 topics in parallel
  const [todayTrend, weekTrend, monthTrend] = await Promise.all([
    getEntityTrendData(
      todayTopics.slice(0, CHART_ENTITIES).map((t) => t.entityTextLower),
      TREND_DAYS.today,
    ),
    getEntityTrendData(
      weekTopics.slice(0, CHART_ENTITIES).map((t) => t.entityTextLower),
      TREND_DAYS.week,
    ),
    getEntityTrendData(
      monthTopics.slice(0, CHART_ENTITIES).map((t) => t.entityTextLower),
      TREND_DAYS.month,
    ),
  ]);

  return (
    <HotTopicsClient
      todayTopics={todayTopics}
      weekTopics={weekTopics}
      monthTopics={monthTopics}
      todayTrend={todayTrend}
      weekTrend={weekTrend}
      monthTrend={monthTrend}
      trendDays={TREND_DAYS}
      feedsCount={feedsCount}
      subscriptionsCount={subscriptionsCount}
      keywordsCount={keywords.length}
      bookmarksCount={bookmarksCount}
    />
  );
}
