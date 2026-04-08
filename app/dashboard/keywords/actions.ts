"use server";

import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { deleteKeyword, updateKeyword } from "@/data/keywords";

const DeleteKeywordSchema = z.object({
  keywordId: z.string().uuid(),
});

const UpdateKeywordSchema = z.object({
  keywordId: z.string().uuid(),
  keyword: z.string().min(1).max(100),
  isCaseSensitive: z.boolean(),
});

export async function deleteKeywordAction(params: { keywordId: string }) {
  const { userId } = await auth();
  if (!userId) return { error: "Unauthorized" };

  const parsed = DeleteKeywordSchema.safeParse(params);
  if (!parsed.success) return { error: "Invalid input" };

  await deleteKeyword(userId, parsed.data.keywordId);
  revalidatePath("/dashboard/keywords");
}

export async function updateKeywordAction(params: {
  keywordId: string;
  keyword: string;
  isCaseSensitive: boolean;
}) {
  const { userId } = await auth();
  if (!userId) return { error: "Unauthorized" };

  const parsed = UpdateKeywordSchema.safeParse(params);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const { keywordId, keyword, isCaseSensitive } = parsed.data;

  try {
    await updateKeyword(userId, keywordId, keyword, isCaseSensitive);
  } catch {
    return { error: "Keyword already exists" };
  }

  revalidatePath("/dashboard/keywords");
}
