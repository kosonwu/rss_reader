import { db } from "@/db";
import { fetchNerLogs } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function getNerLogs() {
  return db
    .select()
    .from(fetchNerLogs)
    .orderBy(desc(fetchNerLogs.runAt));
}
