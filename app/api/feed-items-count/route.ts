import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { getUserFeedItemsCount } from "@/data/feed-items"

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ count: 0 }, { status: 401 })

  const count = await getUserFeedItemsCount(userId)
  return NextResponse.json({ count })
}
