import { db } from "@/db";
import { fetchEmbeddingLogs } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function getEmbeddingLogs() {
  return db
    .select()
    .from(fetchEmbeddingLogs)
    .orderBy(desc(fetchEmbeddingLogs.runAt));
}
