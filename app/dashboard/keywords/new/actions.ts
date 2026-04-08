"use server";

import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createKeyword } from "@/data/keywords";

const CreateKeywordSchema = z.object({
  keyword: z.string().min(1, "Keyword is required").max(100),
  isCaseSensitive: z.boolean(),
});

export async function createKeywordAction(params: {
  keyword: string;
  isCaseSensitive: boolean;
}) {
  const { userId } = await auth();
  if (!userId) return { error: "Unauthorized" };

  const parsed = CreateKeywordSchema.safeParse(params);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const { keyword, isCaseSensitive } = parsed.data;

  try {
    await createKeyword(userId, keyword, isCaseSensitive);
  } catch {
    return { error: "Keyword already exists" };
  }

  redirect("/dashboard/keywords");
}
