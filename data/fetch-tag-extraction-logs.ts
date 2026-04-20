import { db } from "@/db";
import { fetchTagExtractionLogs } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function getTagExtractionLogs() {
  return db
    .select()
    .from(fetchTagExtractionLogs)
    .orderBy(desc(fetchTagExtractionLogs.runAt));
}
