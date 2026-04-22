import { NextResponse } from "next/server"
import { getAllFeedsStatusCounts } from "@/data/feeds"

export async function GET() {
  const counts = await getAllFeedsStatusCounts()
  return NextResponse.json(counts)
}
