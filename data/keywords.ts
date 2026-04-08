import { db } from "@/db";
import { keywords } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getUserKeywords(userId: string) {
  return db
    .select({
      id: keywords.id,
      keyword: keywords.keyword,
    })
    .from(keywords)
    .where(eq(keywords.userId, userId));
}
