import { NextResponse } from "next/server"

const FETCHER_URL = process.env.FETCHER_URL || "http://localhost:8000"
const FALLBACK_URL = "http://localhost:8000"

async function callFetcher(baseUrl: string): Promise<Response> {
  const res = await fetch(`${baseUrl}/status`, { cache: "no-store" })
  if (!res.ok) throw new Error(`FastAPI ${res.status}`)
  return res
}

export async function GET() {
  let res: Response
  try {
    res = await callFetcher(FETCHER_URL)
  } catch (primaryErr) {
    if (FETCHER_URL !== FALLBACK_URL) {
      try {
        res = await callFetcher(FALLBACK_URL)
      } catch (fallbackErr) {
        console.error("[status] both fetcher URLs failed:", primaryErr, fallbackErr)
        return NextResponse.json({ error: String(fallbackErr) }, { status: 502 })
      }
    } else {
      console.error("[status] fetcher failed:", primaryErr)
      return NextResponse.json({ error: String(primaryErr) }, { status: 502 })
    }
  }
  const data = await res.json()
  return NextResponse.json(data)
}
