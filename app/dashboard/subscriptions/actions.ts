"use server";

import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import {
  subscribeToFeed,
  unsubscribeFromFeed,
  updateSubscription,
} from "@/data/subscriptions";

const uuidFormat = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i;

const SubscribeSchema = z.object({
  feedId: z.string().regex(uuidFormat, "Invalid UUID"),
  displayName: z.string().max(200).nullable(),
  isActive: z.boolean(),
});

export async function subscribeAction(params: {
  feedId: string;
  displayName: string | null;
  isActive: boolean;
}) {
  const { userId } = await auth();
  if (!userId) return { error: "Unauthorized" };

  const parsed = SubscribeSchema.safeParse(params);
  if (!parsed.success) return { error: "Invalid input" };

  try {
    await subscribeToFeed(userId, parsed.data.feedId, {
      displayName: parsed.data.displayName,
      isActive: parsed.data.isActive,
    });
  } catch {
    return { error: "Failed to subscribe" };
  }

  revalidatePath("/dashboard/subscriptions");
  revalidatePath("/dashboard");
}

const UnsubscribeSchema = z.object({
  subscriptionId: z.string().regex(uuidFormat, "Invalid UUID"),
});

export async function unsubscribeAction(params: { subscriptionId: string }) {
  const { userId } = await auth();
  if (!userId) return { error: "Unauthorized" };

  const parsed = UnsubscribeSchema.safeParse(params);
  if (!parsed.success) return { error: "Invalid input" };

  await unsubscribeFromFeed(userId, parsed.data.subscriptionId);
  revalidatePath("/dashboard/subscriptions");
  revalidatePath("/dashboard");
}

const UpdateSubscriptionSchema = z.object({
  subscriptionId: z.string().regex(uuidFormat, "Invalid UUID"),
  displayName: z.string().max(200).nullable(),
  isActive: z.boolean(),
});

export async function updateSubscriptionAction(params: {
  subscriptionId: string;
  displayName: string | null;
  isActive: boolean;
}) {
  const { userId } = await auth();
  if (!userId) return { error: "Unauthorized" };

  const parsed = UpdateSubscriptionSchema.safeParse(params);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    await updateSubscription(userId, parsed.data.subscriptionId, {
      displayName: parsed.data.displayName,
      isActive: parsed.data.isActive,
    });
  } catch {
    return { error: "Failed to update subscription" };
  }

  revalidatePath("/dashboard/subscriptions");
  revalidatePath("/dashboard");
}
