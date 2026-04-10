import { db } from "@/db";
import { keywords } from "@/db/schema";
import { and, asc, eq } from "drizzle-orm";

export async function createKeyword(
  userId: string,
  keyword: string,
  isCaseSensitive: boolean,
) {
  return db
    .insert(keywords)
    .values({ userId, keyword, isCaseSensitive })
    .returning({ id: keywords.id });
}

export async function getUserKeywords(userId: string) {
  return db
    .select({
      id: keywords.id,
      keyword: keywords.keyword,
      isCaseSensitive: keywords.isCaseSensitive,
      createdAt: keywords.createdAt,
    })
    .from(keywords)
    .where(eq(keywords.userId, userId))
    .orderBy(asc(keywords.keyword));
}

export async function deleteKeyword(userId: string, keywordId: string) {
  return db
    .delete(keywords)
    .where(and(eq(keywords.id, keywordId), eq(keywords.userId, userId)));
}

export async function updateKeyword(
  userId: string,
  keywordId: string,
  keyword: string,
  isCaseSensitive: boolean,
) {
  return db
    .update(keywords)
    .set({ keyword, isCaseSensitive })
    .where(and(eq(keywords.id, keywordId), eq(keywords.userId, userId)));
}
