import { db } from "@/db";
import { userProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";

export type UserProfile = {
  userId: string;
  tasteVector: number[] | null;
  topTags: { tag: string; freq: number; type: string }[] | null;
  bookmarkCount: number;
  updatedAt: Date;
};

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const [row] = await db
    .select({
      userId: userProfiles.userId,
      tasteVector: userProfiles.tasteVector,
      topTags: userProfiles.topTags,
      bookmarkCount: userProfiles.bookmarkCount,
      updatedAt: userProfiles.updatedAt,
    })
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId));

  return row ?? null;
}
