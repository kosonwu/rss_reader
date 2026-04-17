"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import {
  ArrowLeftIcon,
  HeartPulseIcon,
  RefreshCwIcon,
  WifiOffIcon,
  ActivityIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import DashboardNav from "@/app/dashboard/_components/dashboard-nav"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const HEALTH_URL = "http://localhost:8000/health"
const STATUS_URL = "http://localhost:8000/status"
const POLL_INTERVAL_MS = 30000

type JsonData = Record<string, unknown>

type FetchState =
  | { status: "loading" }
  | { status: "ok"; data: JsonData; fetchedAt: Date }
  | { status: "error"; message: string; fetchedAt: Date }

// ── Render a single JSON value recursively ─────────────────────────────────────

function JsonValue({ value }: { value: unknown }) {
  if (value === null) {
    return <span className="text-muted-foreground font-mono text-xs">null</span>
  }
  if (typeof value === "boolean") {
    return (
      <span className={`font-mono text-xs ${value ? "text-emerald-400" : "text-red-400"}`}>
        {value.toString()}
      </span>
    )
  }
  if (typeof value === "number") {
    return <span className="font-mono text-xs text-amber-300 tabular-nums">{value}</span>
  }
  if (typeof value === "string") {
    return <span className="font-mono text-xs text-sky-300 break-all">"{value}"</span>
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="font-mono text-xs text-muted-foreground">[]</span>
    }
    return (
      <div className="pl-4 border-l border-white/10 mt-1 space-y-1">
        {value.map((v, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="font-mono text-[10px] text-muted-foreground tabular-nums shrink-0 mt-px">
              [{i}]
            </span>
            <JsonValue value={v} />
          </div>
        ))}
      </div>
    )
  }
  if (typeof value === "object") {
    return <JsonObject data={value as Record<string, unknown>} />
  }
  return <span className="font-mono text-xs text-muted-foreground">{String(value)}</span>
}

function JsonObject({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data)
  if (entries.length === 0) {
    return <span className="font-mono text-xs text-muted-foreground">{"{}"}</span>
  }
  return (
    <div className="space-y-2">
      {entries.map(([key, val]) => (
        <div key={key} className="flex items-start gap-3">
          <span className="font-mono text-[11px] text-muted-foreground shrink-0 min-w-[120px] pt-px">
            {key}
          </span>
          <span className="text-white/20 font-mono text-xs shrink-0 pt-px">:</span>
          <div className="min-w-0 flex-1">
            {typeof val === "object" && val !== null && !Array.isArray(val) ? (
              <Card className="border-white/8 bg-white/3 gap-0 py-3 px-3">
                <JsonObject data={val as Record<string, unknown>} />
              </Card>
            ) : (
              <JsonValue value={val} />
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Status pill ────────────────────────────────────────────────────────────────

function StatusPill({ state }: { state: FetchState }) {
  if (state.status === "loading") {
    return (
      <Badge className="gap-1.5 text-[10px] font-mono bg-white/8 text-muted-foreground border border-white/15 px-2 py-0.5 rounded">
        <RefreshCwIcon className="size-3 animate-spin" />
        connecting
      </Badge>
    )
  }
  if (state.status === "ok") {
    return (
      <Badge className="gap-1.5 text-[10px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded">
        <span className="size-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
        live
      </Badge>
    )
  }
  return (
    <Badge className="gap-1.5 text-[10px] font-mono bg-red-500/15 text-red-400 border border-red-500/25 px-2 py-0.5 rounded">
      <WifiOffIcon className="size-3" />
      unreachable
    </Badge>
  )
}

// ── Reusable endpoint card ─────────────────────────────────────────────────────

function EndpointCard({
  label,
  icon,
  proxyPath,
  externalUrl,
}: {
  label: string
  icon: React.ReactNode
  proxyPath: string
  externalUrl: string
}) {
  const [state, setState] = useState<FetchState>({ status: "loading" })

  async function poll() {
    try {
      const res = await fetch(proxyPath, { cache: "no-store" })
      const data: JsonData = await res.json()
      if (!res.ok) {
        const msg = (data as { error?: string }).error ?? `HTTP ${res.status}`
        setState({ status: "error", message: msg, fetchedAt: new Date() })
        return
      }
      setState({ status: "ok", data, fetchedAt: new Date() })
    } catch {
      setState({ status: "error", message: `Could not reach ${externalUrl}`, fetchedAt: new Date() })
    }
  }

  useEffect(() => {
    poll()
    const id = setInterval(poll, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

  const fetchedAt =
    state.status === "ok" || state.status === "error" ? state.fetchedAt : null

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-amber-400">{icon}</span>
          <span className="text-[10px] font-mono text-amber-400 tracking-[0.2em] uppercase">
            {label}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <StatusPill state={state} />
          {fetchedAt && (
            <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
              {format(fetchedAt, "HH:mm:ss")}
            </span>
          )}
        </div>
      </div>

      {state.status === "loading" && (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-3">
          <RefreshCwIcon className="size-4 opacity-30 animate-spin" />
          <p className="font-mono text-sm">Connecting…</p>
        </div>
      )}

      {state.status === "error" && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <WifiOffIcon className="size-10 opacity-10" />
          <p className="font-mono text-sm text-red-400">{state.message}</p>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs font-mono text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 gap-1.5"
            onClick={poll}
          >
            <RefreshCwIcon className="size-3" />
            Retry now
          </Button>
        </div>
      )}

      {state.status === "ok" && (
        <Card className="border-white/8 bg-white/4 gap-0 py-0">
          <CardHeader className="px-5 pt-5 pb-3 border-b border-white/8">
            <CardTitle className="flex items-center gap-2 text-sm font-mono font-normal text-muted-foreground">
              <span className="text-amber-400">{icon}</span>
              {externalUrl}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 py-5">
            <JsonObject data={state.data} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function HealthClient({
  feedsCount,
  subscriptionsCount,
  keywordsCount,
  bookmarksCount,
}: {
  feedsCount: number
  subscriptionsCount: number
  keywordsCount: number
  bookmarksCount: number
}) {
  return (
    <div className="dark min-h-screen bg-[oklch(0.09_0_0)] text-foreground">
      {/* ── Header ── */}
      <div className="border-b border-white/8 px-6 py-7 lg:px-10">
        <div className="max-w-7xl mx-auto flex items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <HeartPulseIcon className="size-4 text-amber-400" />
              <span className="text-[10px] font-mono text-amber-400 tracking-[0.25em] uppercase">
                Distill
              </span>
              <span className="text-white/20 text-[10px]">/</span>
              <Button
                asChild
                variant="ghost"
                className="h-auto p-0 text-[10px] font-mono text-muted-foreground hover:text-amber-400 tracking-[0.25em] uppercase gap-1"
              >
                <Link href="/dashboard">
                  <ArrowLeftIcon className="size-2.5" />
                  Dashboard
                </Link>
              </Button>
            </div>
            <h1 className="text-[2.2rem] font-[family-name:var(--font-playfair)] font-bold tracking-tight leading-none">
              AP Health
            </h1>
            <p className="text-xs font-mono text-muted-foreground mt-2 tracking-wide">
              Refreshes every {POLL_INTERVAL_MS / 1000}s
            </p>
          </div>

          <DashboardNav
            feedsCount={feedsCount}
            subscriptionsCount={subscriptionsCount}
            keywordsCount={keywordsCount}
            bookmarksCount={bookmarksCount}
            activePage="health"
          />
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-4xl mx-auto px-6 py-8 lg:px-10 space-y-10">
        <EndpointCard
          label="Health"
          icon={<HeartPulseIcon className="size-3.5" />}
          proxyPath="/api/health"
          externalUrl={HEALTH_URL}
        />

        <div className="border-t border-white/8" />

        <EndpointCard
          label="Status"
          icon={<ActivityIcon className="size-3.5" />}
          proxyPath="/api/status"
          externalUrl={STATUS_URL}
        />
      </div>
    </div>
  )
}
