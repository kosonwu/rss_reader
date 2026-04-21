import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getUserBookmarks } from "@/data/bookmarks";
import { getUserFeeds, getAllFeedsDetailed } from "@/data/feeds";
import { getUserKeywords } from "@/data/keywords";
import { getSubscriptionsCount } from "@/data/subscriptions";
import { getUserProfile } from "@/data/user-profiles";
import BookmarksClient from "./_components/bookmarks-client";

export default async function BookmarksPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [bookmarks, feeds, allFeeds, keywords, subscriptionsCount, userProfile] = await Promise.all([
    getUserBookmarks(userId),
    getUserFeeds(userId),
    getAllFeedsDetailed(),
    getUserKeywords(userId),
    getSubscriptionsCount(userId),
    getUserProfile(userId),
  ]);

  const serializedBookmarks = bookmarks.map((item) => ({
    ...item,
    publishedAt: item.publishedAt?.toISOString() ?? null,
    bookmarkedAt: item.bookmarkedAt.toISOString(),
    isRead: Boolean(item.isRead),
    displayTags: item.displayTags ?? null,
    readingTimeMinutes: item.readingTimeMinutes,
  }));

  const topTags = (userProfile?.topTags ?? []).slice(0, 10);

  return (
    <BookmarksClient
      bookmarks={serializedBookmarks}
      feeds={feeds}
      feedsCount={allFeeds.length}
      keywords={keywords}
      subscriptionsCount={subscriptionsCount}
      keywordsCount={keywords.length}
      topTags={topTags}
    />
  );
}
