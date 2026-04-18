"use server";

import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { addBookmark, removeBookmark, markItemAsRead, markItemAsUnread, bulkAddBookmarksByTag } from "@/data/bookmarks";

const uuidFormat =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i;
const FeedItemIdSchema = z.object({ feedItemId: z.string().regex(uuidFormat, "Invalid UUID") });

export async function markAsReadAction(params: { feedItemId: string }) {
  const { userId } = await auth();
  if (!userId) return { error: "Unauthorized" };
  const parsed = FeedItemIdSchema.safeParse(params);
  if (!parsed.success) return { error: "Invalid input" };
  await markItemAsRead(userId, parsed.data.feedItemId);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/bookmarks");
}

export async function markAsUnreadAction(params: { feedItemId: string }) {
  const { userId } = await auth();
  if (!userId) return { error: "Unauthorized" };
  const parsed = FeedItemIdSchema.safeParse(params);
  if (!parsed.success) return { error: "Invalid input" };
  await markItemAsUnread(userId, parsed.data.feedItemId);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/bookmarks");
}

export async function bulkBookmarkByTagAction(params: {
  tag: string
  dateFrom: string
  dateTo: string
}) {
  const { userId } = await auth();
  if (!userId) return { error: "Unauthorized" };
  if (!params.tag || params.tag.trim() === "") return { error: "Invalid tag" };
  const count = await bulkAddBookmarksByTag(
    userId,
    params.tag.trim(),
    new Date(params.dateFrom),
    new Date(params.dateTo),
  );
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/bookmarks");
  return { count };
}

export async function toggleBookmarkAction(params: {
  feedItemId: string;
  isCurrentlyBookmarked: boolean;
}) {
  const { userId } = await auth();
  if (!userId) return { error: "Unauthorized" };
  const parsed = FeedItemIdSchema.safeParse(params);
  if (!parsed.success) return { error: "Invalid input" };
  if (params.isCurrentlyBookmarked) {
    await removeBookmark(userId, parsed.data.feedItemId);
  } else {
    await addBookmark(userId, parsed.data.feedItemId);
  }
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/bookmarks");
}
