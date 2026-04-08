"use client"

import { useState } from "react"
import { format, startOfMonth, endOfDay, isWithinInterval, parseISO } from "date-fns"
import {
  CalendarIcon,
  RssIcon,
  TagIcon,
  ExternalLinkIcon,
  FilterIcon,
  NewspaperIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Separator } from "@/components/ui/separator"

// ── Types ──────────────────────────────────────────────────────────────────────

type Feed = {
  id: string
  title: string | null
  url: string
}

type FeedItem = {
  id: string
  feedId: string
  title: string | null
  description: string | null
  url: string | null
  ogImageUrl: string | null
  publishedAt: string | null
}

type Keyword = {
  id: string
  keyword: string
}

// ── Style palette ──────────────────────────────────────────────────────────────

const GRADIENT_PALETTE = [
  "from-emerald-950 via-emerald-900 to-slate-900",
  "from-orange-950 via-orange-900 to-slate-900",
  "from-red-950 via-red-900 to-slate-900",
  "from-blue-950 via-blue-900 to-slate-900",
  "from-cyan-950 via-cyan-900 to-slate-900",
  "from-violet-950 via-violet-900 to-slate-900",
  "from-fuchsia-950 via-fuchsia-900 to-slate-900",
  "from-amber-950 via-amber-900 to-slate-900",
]

const BADGE_PALETTE = [
  "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  "bg-orange-500/15 text-orange-400 border-orange-500/25",
  "bg-red-500/15 text-red-400 border-red-500/25",
  "bg-blue-500/15 text-blue-400 border-blue-500/25",
  "bg-cyan-500/15 text-cyan-400 border-cyan-500/25",
  "bg-violet-500/15 text-violet-400 border-violet-500/25",
  "bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/25",
  "bg-amber-500/15 text-amber-400 border-amber-500/25",
]

function feedStyle(feedIndex: number) {
  const i = feedIndex % GRADIENT_PALETTE.length
  return { gradient: GRADIENT_PALETTE[i], badge: BADGE_PALETTE[i] }
}

// ── DatePicker sub-component ───────────────────────────────────────────────────

function DatePicker({
  date,
  onSelect,
  label,
}: {
  date: Date
  onSelect: (d: Date) => void
  label: string
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="h-9 gap-2.5 pl-3 pr-3 font-mono text-sm min-w-[190px] justify-start border-white/15 bg-white/5 hover:bg-white/10"
        >
          <CalendarIcon className="size-3.5 text-amber-400 shrink-0" />
          <div className="flex flex-col items-start leading-none">
            <span className="text-[9px] text-muted-foreground tracking-widest uppercase mb-0.5">
              {label}
            </span>
            <span className="text-xs text-foreground">{format(date, "do MMM yyyy")}</span>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => d && onSelect(d)}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function DashboardClient({
  feeds,
  feedItems,
  keywords,
}: {
  feeds: Feed[]
  feedItems: FeedItem[]
  keywords: Keyword[]
}) {
  const today = new Date()
  const firstOfMonth = startOfMonth(today)

  const [dateFrom, setDateFrom] = useState<Date>(firstOfMonth)
  const [dateTo, setDateTo] = useState<Date>(today)
  const [selectedFeed, setSelectedFeed] = useState<string>("all")
  const [selectedKeyword, setSelectedKeyword] = useState<string>("all")

  // Build a map of feedId → index for consistent styling
  const feedIndexMap = new Map(feeds.map((f, i) => [f.id, i]))

  function getMatchedKeywords(item: FeedItem): string[] {
    const text = `${item.title ?? ""} ${item.description ?? ""}`.toLowerCase()
    return keywords
      .filter((kw) => text.includes(kw.keyword.toLowerCase()))
      .map((kw) => kw.keyword)
  }

  const filtered = feedItems.filter((item) => {
    const pub = item.publishedAt ? parseISO(item.publishedAt) : null
    const inRange = pub
      ? isWithinInterval(pub, { start: dateFrom, end: endOfDay(dateTo) })
      : false
    const matchFeed = selectedFeed === "all" || item.feedId === selectedFeed
    const matchKeyword =
      selectedKeyword === "all" || getMatchedKeywords(item).includes(selectedKeyword)
    return inRange && matchFeed && matchKeyword
  })

  return (
    <div className="dark min-h-screen bg-[oklch(0.09_0_0)] text-foreground">

      {/* ── Header ── */}
      <div className="border-b border-white/8 px-6 py-7 lg:px-10">
        <div className="max-w-7xl mx-auto flex items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <RssIcon className="size-4 text-amber-400" />
              <span className="text-[10px] font-mono text-amber-400 tracking-[0.25em] uppercase">
                RSS Reader
              </span>
            </div>
            <h1 className="text-[2.2rem] font-[family-name:var(--font-playfair)] font-bold tracking-tight leading-none">
              Dashboard
            </h1>
            <p className="text-xs font-mono text-muted-foreground mt-2 tracking-wide">
              {format(dateFrom, "do MMM yyyy")}
              <span className="mx-2 text-white/20">—</span>
              {format(dateTo, "do MMM yyyy")}
            </p>
          </div>

          <div className="text-right shrink-0">
            <div className="text-[2.8rem] font-mono font-light text-amber-400 leading-none tabular-nums">
              {filtered.length}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1 tracking-widest uppercase font-mono">
              {filtered.length === 1 ? "article" : "articles"}
            </div>
          </div>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="sticky top-0 z-20 border-b border-white/8 bg-[oklch(0.09_0_0)]/92 backdrop-blur-xl px-6 py-3 lg:px-10">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-2.5">
          <FilterIcon className="size-3.5 text-muted-foreground shrink-0 mr-0.5" />

          <DatePicker date={dateFrom} onSelect={setDateFrom} label="From" />
          <DatePicker date={dateTo} onSelect={setDateTo} label="To" />

          <Separator orientation="vertical" className="h-7 bg-white/10 mx-1" />

          {/* Feed select */}
          <Select value={selectedFeed} onValueChange={setSelectedFeed}>
            <SelectTrigger className="h-9 min-w-[170px] font-mono text-xs border-white/15 bg-white/5 hover:bg-white/10 gap-2">
              <RssIcon className="size-3.5 text-amber-400 shrink-0" />
              <SelectValue placeholder="All Feeds" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="font-mono text-xs">
                All Feeds
              </SelectItem>
              {feeds.map((f) => (
                <SelectItem key={f.id} value={f.id} className="font-mono text-xs">
                  {f.title ?? f.url}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Keyword select */}
          <Select value={selectedKeyword} onValueChange={setSelectedKeyword}>
            <SelectTrigger className="h-9 min-w-[170px] font-mono text-xs border-white/15 bg-white/5 hover:bg-white/10 gap-2">
              <TagIcon className="size-3.5 text-amber-400 shrink-0" />
              <SelectValue placeholder="All Keywords" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="font-mono text-xs">
                All Keywords
              </SelectItem>
              {keywords.map((kw) => (
                <SelectItem key={kw.id} value={kw.keyword} className="font-mono text-xs">
                  {kw.keyword}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Article grid ── */}
      <div className="max-w-7xl mx-auto px-6 py-8 lg:px-10">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-muted-foreground gap-4">
            <NewspaperIcon className="size-14 opacity-10" />
            <p className="font-mono text-sm">No articles match your current filters.</p>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs font-mono text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
              onClick={() => {
                setSelectedFeed("all")
                setSelectedKeyword("all")
                setDateFrom(firstOfMonth)
                setDateTo(today)
              }}
            >
              Clear all filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((item) => {
              const feedIdx = feedIndexMap.get(item.feedId) ?? 0
              const { gradient, badge } = feedStyle(feedIdx)
              const feed = feeds.find((f) => f.id === item.feedId)
              const feedName = feed?.title ?? feed?.url ?? "Unknown Feed"
              const matchedKeywords = getMatchedKeywords(item)
              const publishedDate = item.publishedAt ? parseISO(item.publishedAt) : null

              return (
                <Card
                  key={item.id}
                  className="group border-white/8 hover:border-amber-500/35 transition-all duration-300 bg-white/4 hover:bg-white/6 gap-0 py-0"
                >
                  {/* OG image or gradient placeholder */}
                  <div className="h-36 relative overflow-hidden rounded-t-xl">
                    {item.ogImageUrl ? (
                      <img
                        src={item.ogImageUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-br ${gradient}`} />
                    )}
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_70%_20%,rgba(255,255,255,0.06),transparent)]" />
                    <div className="absolute bottom-2.5 left-3 flex flex-wrap items-center gap-1.5">
                      <Badge className={`text-[9px] font-mono border px-1.5 py-0.5 rounded ${badge}`}>
                        {feedName}
                      </Badge>
                      {matchedKeywords.map((kw) => (
                        <Badge
                          key={kw}
                          className="text-[9px] font-mono bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded"
                        >
                          {kw}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <CardHeader className="pt-4 pb-2 px-4">
                    <CardTitle className="font-[family-name:var(--font-playfair)] text-[0.95rem] leading-snug font-semibold group-hover:text-amber-400 transition-colors duration-200 line-clamp-2">
                      {item.title ?? "Untitled"}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="px-4 pb-0">
                    <CardDescription className="line-clamp-3 text-[0.8rem] leading-relaxed">
                      {item.description}
                    </CardDescription>
                  </CardContent>

                  <CardFooter className="px-4 pt-3 pb-3 flex items-center justify-between bg-transparent border-t-0">
                    <span className="font-mono text-[10px] text-muted-foreground tracking-wide">
                      {publishedDate ? format(publishedDate, "do MMM yyyy") : "—"}
                    </span>
                    {item.url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1.5 px-2 text-[11px] font-mono text-amber-400/80 hover:text-amber-300 hover:bg-amber-500/10"
                        asChild
                      >
                        <a href={item.url} target="_blank" rel="noopener noreferrer">
                          Read Article
                          <ExternalLinkIcon className="size-3" />
                        </a>
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
