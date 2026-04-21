"use server";

import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { feeds } from "@/db/schema";
import { eq } from "drizzle-orm";
import { addFeed, removeFeed, updateFeed } from "@/data/feeds";

const uuidFormat = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i;

const FeedStatusEnum = z.enum(["pending", "active", "error", "paused"]);

const FeedLanguageEnum = z.enum(["en", "zh-TW"]).nullable();

const FeedFieldsSchema = z.object({
  title: z.string().max(500).nullable(),
  description: z.string().max(2000).nullable(),
  siteUrl: z.union([z.string().url(), z.literal("")]).nullable(),
  fetchStatus: FeedStatusEnum,
  fetchIntervalMinutes: z.number().int().min(1).max(10080),
  language: FeedLanguageEnum,
});

const AddFeedSchema = FeedFieldsSchema.extend({
  url: z.string().url("Please enter a valid URL"),
});

export async function addFeedAction(params: {
  url: string;
  title: string | null;
  description: string | null;
  siteUrl: string | null;
  fetchStatus: "pending" | "active" | "error" | "paused";
  fetchIntervalMinutes: number;
  language: "en" | "zh-TW" | null;
}) {
  const { userId } = await auth();
  if (!userId) return { error: "Unauthorized" };

  const parsed = AddFeedSchema.safeParse(params);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { url, ...fields } = parsed.data;
  // Normalise empty siteUrl to null
  const siteUrl = fields.siteUrl === "" ? null : fields.siteUrl;

  try {
    await addFeed(url, { ...fields, siteUrl }, userId);
  } catch {
    return { error: "Failed to add feed" };
  }

  revalidatePath("/dashboard/feeds");
}

const RemoveFeedSchema = z.object({
  feedId: z.string().regex(uuidFormat, "Invalid UUID"),
});

export async function removeFeedAction(params: { feedId: string }) {
  const { userId } = await auth();
  if (!userId) return { error: "Unauthorized" };

  const parsed = RemoveFeedSchema.safeParse(params);
  if (!parsed.success) return { error: "Invalid input" };

  const feed = await db.query.feeds.findFirst({ where: eq(feeds.id, parsed.data.feedId) });
  if (!feed || feed.userId !== userId) return { error: "Forbidden" };

  await removeFeed(parsed.data.feedId);
  revalidatePath("/dashboard/feeds");
}

const UpdateFeedSchema = FeedFieldsSchema.extend({
  feedId: z.string().regex(uuidFormat, "Invalid UUID"),
});

export async function updateFeedAction(params: {
  feedId: string;
  title: string | null;
  description: string | null;
  siteUrl: string | null;
  fetchStatus: "pending" | "active" | "error" | "paused";
  fetchIntervalMinutes: number;
  language: "en" | "zh-TW" | null;
}) {
  const { userId } = await auth();
  if (!userId) return { error: "Unauthorized" };

  const parsed = UpdateFeedSchema.safeParse(params);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { feedId, siteUrl, ...rest } = parsed.data;
  const normalisedSiteUrl = siteUrl === "" ? null : siteUrl;

  const feed = await db.query.feeds.findFirst({ where: eq(feeds.id, feedId) });
  if (!feed || (feed.userId !== null && feed.userId !== userId)) return { error: "Forbidden" };

  try {
    await updateFeed(feedId, { ...rest, siteUrl: normalisedSiteUrl });
  } catch {
    return { error: "Feed not found" };
  }

  revalidatePath("/dashboard/feeds");
}
