import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { db } from "@/db"
import { feedItems, userReadItems, userBookmarks } from "@/db/schema"
import { and, eq, inArray } from "drizzle-orm"

const FETCHER_URL = process.env.FETCHER_URL || "http://localhost:8000"
const FALLBACK_URL = "http://localhost:8000"

type FetcherRow = {
  id: string
  feed_id: string
  title: string | null
  description: string | null
  url: string | null
  og_image_url: string | null
  published_at: string | null
  reading_time_minutes: number | null
}

async function callFetcher(baseUrl: string, body: string): Promise<FetcherRow[]> {
  const res = await fetch(`${baseUrl}/embed/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    cache: "no-store",
  })
  if (!res.ok) throw new Error(`FastAPI ${res.status}`)
  return res.json()
}

export async function GET(request: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const q = new URL(request.url).searchParams.get("q")?.trim()
  if (!q) return NextResponse.json({ error: "Missing query" }, { status: 400 })

  const payload = JSON.stringify({ query: q, user_id: userId, limit: 20 })

  let rows: FetcherRow[]
  try {
    rows = await callFetcher(FETCHER_URL, payload)
  } catch (primaryErr) {
    if (FETCHER_URL !== FALLBACK_URL) {
      try {
        rows = await callFetcher(FALLBACK_URL, payload)
      } catch (fallbackErr) {
        console.error("[search] both fetcher URLs failed:", primaryErr, fallbackErr)
        return NextResponse.json({ error: String(fallbackErr) }, { status: 502 })
      }
    } else {
      console.error("[search] fetcher failed:", primaryErr)
      return NextResponse.json({ error: String(primaryErr) }, { status: 502 })
    }
  }

  if (rows.length === 0) return NextResponse.json([])

  const ids = rows.map((r) => r.id)
  const [readRows, bookmarkRows, tagRows] = await Promise.all([
    db
      .select({ feedItemId: userReadItems.feedItemId })
      .from(userReadItems)
      .where(and(eq(userReadItems.userId, userId), inArray(userReadItems.feedItemId, ids))),
    db
      .select({ feedItemId: userBookmarks.feedItemId })
      .from(userBookmarks)
      .where(and(eq(userBookmarks.userId, userId), inArray(userBookmarks.feedItemId, ids))),
    db
      .select({ id: feedItems.id, displayTags: feedItems.displayTags })
      .from(feedItems)
      .where(inArray(feedItems.id, ids)),
  ])

  const readSet = new Set(readRows.map((r) => r.feedItemId))
  const bookmarkSet = new Set(bookmarkRows.map((r) => r.feedItemId))
  const tagsMap = new Map(tagRows.map((r) => [r.id, r.displayTags]))

  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      feedId: r.feed_id,
      title: r.title,
      description: r.description,
      url: r.url,
      ogImageUrl: r.og_image_url,
      publishedAt: r.published_at,
      isRead: readSet.has(r.id),
      isBookmarked: bookmarkSet.has(r.id),
      readingTimeMinutes: r.reading_time_minutes ?? 1,
      displayTags: tagsMap.get(r.id) ?? null,
    })),
  )
}
