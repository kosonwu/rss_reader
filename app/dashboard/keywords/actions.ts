"use server";

import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createKeyword, deleteKeyword, updateKeyword } from "@/data/keywords";

const CreateKeywordSchema = z.object({
  keyword: z.string().min(1, "Keyword is required").max(100),
  isCaseSensitive: z.boolean(),
  source: z.enum(["manual", "tag"]).optional().default("manual"),
});

export async function createKeywordAction(params: {
  keyword: string;
  isCaseSensitive: boolean;
  source?: "manual" | "tag";
}) {
  const { userId } = await auth();
  if (!userId) return { error: "Unauthorized" };

  const parsed = CreateKeywordSchema.safeParse(params);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { keyword, isCaseSensitive, source } = parsed.data;

  try {
    await createKeyword(userId, keyword, isCaseSensitive, source);
  } catch {
    return { error: "Keyword already exists" };
  }

  revalidatePath("/dashboard/keywords");
}

const uuidFormat = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i;

const DeleteKeywordSchema = z.object({
  keywordId: z.string().regex(uuidFormat, "Invalid UUID"),
});

const UpdateKeywordSchema = z.object({
  keywordId: z.string().regex(uuidFormat, "Invalid UUID"),
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
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { keywordId, keyword, isCaseSensitive } = parsed.data;

  try {
    await updateKeyword(userId, keywordId, keyword, isCaseSensitive);
  } catch {
    return { error: "Keyword already exists" };
  }

  revalidatePath("/dashboard/keywords");
}
