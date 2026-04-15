"use client"

import { useState, useEffect, useRef, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { format, startOfMonth, startOfDay, endOfDay, isWithinInterval, parseISO } from "date-fns"
import {
  BookmarkIcon,
  BookmarkCheckIcon,
  BrainCircuitIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  RssIcon,
  TagIcon,
  ExternalLinkIcon,
  FilterIcon,
  NewspaperIcon,
  Loader2Icon,
  SearchIcon,
  CheckIcon,
  XIcon,
  AlertCircleIcon,
  ArrowLeftRightIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { markAsReadAction, markAsUnreadAction, toggleBookmarkAction } from "../actions"
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
import { Input } from "@/components/ui/input"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from "@/components/ui/pagination"
import DashboardNav from "@/app/dashboard/_components/dashboard-nav"

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
  isRead: boolean
  isBookmarked: boolean
  readingTimeMinutes: number
  displayTags: string[] | null
}

type Keyword = {
  id: string
  keyword: string
}

// ── Pagination ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 66

function getPageRange(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const left = Math.max(2, current - 1)
  const right = Math.min(total - 1, current + 1)
  const range: (number | "ellipsis")[] = [1]
  if (left > 2) range.push("ellipsis")
  for (let i = left; i <= right; i++) range.push(i)
  if (right < total - 1) range.push("ellipsis")
  range.push(total)
  return range
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
  error,
}: {
  date: Date
  onSelect: (d: Date) => void
  label: string
  error?: boolean
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-9 gap-2.5 pl-3 pr-3 font-mono text-sm min-w-[190px] justify-start bg-white/5 hover:bg-white/10",
            error
              ? "border-red-500/60 hover:border-red-400/70 text-red-400"
              : "border-white/15"
          )}
        >
          <CalendarIcon className={cn("size-3.5 shrink-0", error ? "text-red-400" : "text-amber-400")} />
          <div className="flex flex-col items-start leading-none">
            <span className="text-[9px] text-muted-foreground tracking-widest uppercase mb-0.5">
              {label}
            </span>
            <span className={cn("text-xs", error ? "text-red-300" : "text-foreground")}>{format(date, "do MMM yyyy")}</span>
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
  feedsCount,
  feedItems,
  keywords,
  subscriptionsCount,
}: {
  feeds: Feed[]
  feedsCount: number
  feedItems: FeedItem[]
  keywords: Keyword[]
  subscriptionsCount: number
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const knownCount = useRef(feedItems.length)

  // Optimistic state for instant visual feedback
  const [readIds, setReadIds] = useState<Set<string>>(
    () => new Set(feedItems.filter((i) => i.isRead).map((i) => i.id))
  )
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(
    () => new Set(feedItems.filter((i) => i.isBookmarked).map((i) => i.id))
  )
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [submittedQuery, setSubmittedQuery] = useState<string>("")
  const [searchItems, setSearchItems] = useState<FeedItem[] | null>(null)
  const [isSearching, setIsSearching] = useState<boolean>(false)

  // Keep knownCount in sync after router.refresh() delivers new props
  useEffect(() => {
    knownCount.current = feedItems.length
  }, [feedItems.length])

  useEffect(() => {
    const POLL_INTERVAL = 60_000 // 60 seconds
    const id = setInterval(async () => {
      try {
        const res = await fetch("/api/feed-items-count")
        if (!res.ok) return
        const { count } = await res.json()
        if (count > knownCount.current) {
          knownCount.current = count
          router.refresh()
        }
      } catch {
        // network error — silently skip
      }
    }, POLL_INTERVAL)
    return () => clearInterval(id)
  }, [router])

  async function runSearch(query: string) {
    const trimmed = query.trim()
    if (!trimmed) {
      setSubmittedQuery("")
      setSearchItems(null)
      setIsSearching(false)
      return
    }
    setSubmittedQuery(trimmed)
    setIsSearching(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`)
      if (!res.ok) { setSearchItems([]); return }
      const items: FeedItem[] = await res.json()
      setSearchItems(items)
      const newRead = items.filter((i) => i.isRead).map((i) => i.id)
      const newBm   = items.filter((i) => i.isBookmarked).map((i) => i.id)
      if (newRead.length) setReadIds((p) => new Set([...p, ...newRead]))
      if (newBm.length)   setBookmarkedIds((p) => new Set([...p, ...newBm]))
    } catch {
      setSearchItems([])
    } finally {
      setIsSearching(false)
    }
  }

  const today = new Date()
  const firstOfMonth = startOfMonth(today)

  const [dateFrom, setDateFrom] = useState<Date>(today)
  const [dateTo, setDateTo] = useState<Date>(today)
  const [selectedFeed, setSelectedFeed] = useState<string>("all")
  const [selectedKeyword, setSelectedKeyword] = useState<string>("all")
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  // Reset to page 1 whenever any filter or search query changes
  useEffect(() => { setCurrentPage(1) }, [dateFrom, dateTo, selectedFeed, selectedKeyword, submittedQuery, selectedTag])

  function handleResetDashboard() {
    const now = new Date()
    setDateFrom(now)
    setDateTo(now)
    setSelectedFeed("all")
    setSelectedKeyword("all")
    setSelectedTag(null)
    setCurrentPage(1)
    setSearchQuery("")
    setSubmittedQuery("")
    setSearchItems(null)
    router.refresh()
  }

  function handleReadArticle(itemId: string) {
    if (!readIds.has(itemId)) {
      setReadIds((prev) => new Set(prev).add(itemId))
      startTransition(() => { markAsReadAction({ feedItemId: itemId }) })
    }
  }

  function handleToggleRead(itemId: string) {
    if (readIds.has(itemId)) {
      setReadIds((prev) => { const next = new Set(prev); next.delete(itemId); return next })
      startTransition(() => { markAsUnreadAction({ feedItemId: itemId }) })
    } else {
      setReadIds((prev) => new Set(prev).add(itemId))
      startTransition(() => { markAsReadAction({ feedItemId: itemId }) })
    }
  }

  function handleToggleBookmark(itemId: string) {
    const isCurrentlyBookmarked = bookmarkedIds.has(itemId)
    if (isCurrentlyBookmarked) {
      setBookmarkedIds((prev) => { const next = new Set(prev); next.delete(itemId); return next })
    } else {
      setBookmarkedIds((prev) => new Set(prev).add(itemId))
    }
    startTransition(() => {
      toggleBookmarkAction({ feedItemId: itemId, isCurrentlyBookmarked })
    })
  }

  // Build a map of feedId → index for consistent styling
  const feedIndexMap = new Map(feeds.map((f, i) => [f.id, i]))

  function getMatchedKeywords(item: FeedItem): string[] {
    const text = `${item.title ?? ""} ${item.description ?? ""}`.toLowerCase()
    return keywords
      .filter((kw) => text.includes(kw.keyword.toLowerCase()))
      .map((kw) => kw.keyword)
  }

  const isInvalidDateRange = startOfDay(dateFrom) > startOfDay(dateTo)

  function handleSwapDates() {
    const prev = dateFrom
    setDateFrom(dateTo)
    setDateTo(prev)
  }

  const filtered = isInvalidDateRange ? [] : feedItems.filter((item) => {
    const pub = item.publishedAt ? parseISO(item.publishedAt) : null
    const inRange = pub
      ? isWithinInterval(pub, { start: startOfDay(dateFrom), end: endOfDay(dateTo) })
      : false
    const matchFeed = selectedFeed === "all" || item.feedId === selectedFeed
    const matchKeyword =
      selectedKeyword === "all" || getMatchedKeywords(item).includes(selectedKeyword)
    const matchTag =
      !selectedTag || (item.displayTags?.some((t) => t.toLowerCase() === selectedTag.toLowerCase()) ?? false)
    return inRange && matchFeed && matchKeyword && matchTag
  })

  const isSearchMode = submittedQuery.length > 0
  const displayItems = isSearchMode ? (searchItems ?? []) : filtered

  // Pagination — only applied in non-search mode
  const totalPages = isSearchMode ? 1 : Math.ceil(filtered.length / PAGE_SIZE)
  const pageStart = (currentPage - 1) * PAGE_SIZE
  const pagedItems = isSearchMode ? displayItems : filtered.slice(pageStart, pageStart + PAGE_SIZE)

  function goToPage(page: number) {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

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
              <button onClick={handleResetDashboard} className="hover:text-amber-400 transition-colors duration-200 cursor-pointer">
                Dashboard
              </button>
            </h1>
            <p className={cn("text-xs font-mono mt-2 tracking-wide", isInvalidDateRange ? "text-red-400" : "text-muted-foreground")}>
              {format(dateFrom, "do MMM yyyy")}
              <span className={cn("mx-2", isInvalidDateRange ? "text-red-500/50" : "text-white/20")}>—</span>
              {format(dateTo, "do MMM yyyy")}
            </p>
          </div>

          <div className="flex items-end gap-6 shrink-0">
            <DashboardNav
              feedsCount={feedsCount}
              subscriptionsCount={subscriptionsCount}
              keywordsCount={keywords.length}
              bookmarksCount={bookmarkedIds.size}
            />

            <div className="text-right">
              <div className="text-[2.8rem] font-mono font-light text-amber-400 leading-none tabular-nums">
                {displayItems.length}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1 tracking-widest uppercase font-mono">
                {displayItems.length === 1 ? "article" : "articles"}
              </div>
              {!isSearchMode && totalPages > 1 && (
                <div className="text-[9px] font-mono text-white/30 mt-0.5 tracking-widest">
                  pg {currentPage}/{totalPages}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="sticky top-0 z-20 border-b border-white/8 bg-[oklch(0.09_0_0)]/92 backdrop-blur-xl px-6 py-3 lg:px-10">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-2.5">
          <FilterIcon className="size-3.5 text-muted-foreground shrink-0 mr-0.5" />

          <DatePicker date={dateFrom} onSelect={setDateFrom} label="From" error={isInvalidDateRange} />
          <DatePicker date={dateTo} onSelect={setDateTo} label="To" error={isInvalidDateRange} />

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
              {[...feeds].sort((a, b) => (a.title ?? a.url).localeCompare(b.title ?? b.url)).map((f) => (
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
              {[...keywords].sort((a, b) => a.keyword.localeCompare(b.keyword)).map((kw) => (
                <SelectItem key={kw.id} value={kw.keyword} className="font-mono text-xs">
                  {kw.keyword}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Active tag filter chip */}
          {selectedTag && (
            <Button
              variant="outline"
              className="h-9 gap-1.5 px-2.5 font-mono text-xs bg-violet-500/15 text-violet-300 border-violet-400/30 hover:bg-violet-500/25 hover:text-violet-200 hover:border-violet-300/50"
              onClick={() => setSelectedTag(null)}
            >
              <TagIcon className="size-3 shrink-0 text-violet-400" />
              {selectedTag}
              <XIcon className="size-3 shrink-0 opacity-60" />
            </Button>
          )}

          {/* Semantic search */}
          <div className="relative ml-auto flex items-center">
            {isSearching
              ? <Loader2Icon className="absolute left-2.5 size-3.5 text-amber-400 pointer-events-none animate-spin" />
              : <SearchIcon className="absolute left-2.5 size-3.5 text-muted-foreground pointer-events-none" />
            }
            <Input
              type="search"
              placeholder="Semantic search… ↵"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                if (!e.target.value.trim()) {
                  setSubmittedQuery("")
                  setSearchItems(null)
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") runSearch(searchQuery)
              }}
              className="h-9 pl-8 pr-3 w-[220px] font-mono text-xs border-white/15 bg-white/5 hover:bg-white/10 focus-visible:border-amber-500/50 focus-visible:ring-amber-500/20"
            />
            {isSearchMode && (
              <Badge className="absolute -top-1.5 -right-1.5 text-[8px] font-mono bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1 py-0 rounded flex items-center gap-0.5">
                <BrainCircuitIcon className="size-2.5" />
                semantic
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* ── Article grid ── */}
      <div className="max-w-7xl mx-auto px-6 py-8 lg:px-10">
        {isInvalidDateRange ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <AlertCircleIcon className="size-12 text-red-400/60" />
            <div className="text-center">
              <p className="font-mono text-sm text-red-400 mb-1">日期範圍無效</p>
              <p className="font-mono text-xs text-muted-foreground">
                「起始日期」不可晚於「結束日期」
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 font-mono text-xs border-red-500/30 text-red-400 bg-red-500/5 hover:bg-red-500/15 hover:text-red-300 hover:border-red-400/50"
              onClick={handleSwapDates}
            >
              <ArrowLeftRightIcon className="size-3.5" />
              交換日期
            </Button>
          </div>
        ) : isSearchMode && isSearching ? (
          <div className="flex flex-col items-center justify-center py-32 text-muted-foreground gap-3">
            <Loader2Icon className="size-8 text-amber-400 animate-spin" />
            <p className="font-mono text-xs tracking-widest uppercase">Searching…</p>
          </div>
        ) : displayItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-muted-foreground gap-4">
            <NewspaperIcon className="size-14 opacity-10" />
            <p className="font-mono text-sm">
              {isSearchMode ? "No semantic matches found." : "No articles match your current filters."}
            </p>
            {!isSearchMode && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs font-mono text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                onClick={() => {
                  setSelectedFeed("all")
                  setSelectedKeyword("all")
                  setSelectedTag(null)
                  setDateFrom(firstOfMonth)
                  setDateTo(today)
                }}
              >
                Clear all filters
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pagedItems.map((item) => {
              const feedIdx = feedIndexMap.get(item.feedId) ?? 0
              const { gradient, badge } = feedStyle(feedIdx)
              const feed = feeds.find((f) => f.id === item.feedId)
              const feedName = feed?.title ?? feed?.url ?? "Unknown Feed"
              const matchedKeywords = getMatchedKeywords(item)
              const publishedDate = item.publishedAt ? parseISO(item.publishedAt) : null

              const isRead = readIds.has(item.id)
              const isBookmarked = bookmarkedIds.has(item.id)

              return (
                <Card
                  key={item.id}
                  className={`group border-white/8 hover:border-amber-500/35 transition-all duration-300 bg-white/4 hover:bg-white/6 gap-0 py-0 ${isRead ? "opacity-50 grayscale" : ""}`}
                >
                  {/* OG image or gradient placeholder */}
                  <div className="h-36 relative overflow-hidden rounded-t-xl">
                    {item.ogImageUrl && item.ogImageUrl.startsWith('http') ? (
                      <img
                        src={item.ogImageUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-br ${gradient}`} />
                    )}
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_70%_20%,rgba(255,255,255,0.06),transparent)]" />
                    <div className="absolute top-2 left-2 right-10 flex items-start gap-1 flex-wrap">
                      <Badge className="text-[9px] font-mono bg-black/40 text-white/70 border border-white/15 px-1.5 py-0.5 rounded backdrop-blur-sm shrink-0">
                        {item.readingTimeMinutes > 10 ? "10+ 分鐘" : `${item.readingTimeMinutes} 分鐘`}
                      </Badge>
                      {item.displayTags?.slice().sort((a, b) => a.length - b.length).slice(0, 4).map((tag) => (
                        <Badge
                          key={tag}
                          className={cn(
                            "text-[9px] font-mono px-1.5 py-0.5 rounded backdrop-blur-sm cursor-pointer transition-all duration-150",
                            selectedTag?.toLowerCase() === tag.toLowerCase()
                              ? "bg-violet-700/90 text-violet-100 border border-violet-300/70 ring-1 ring-violet-400/50"
                              : "bg-violet-950/80 text-violet-200 border border-violet-400/40 hover:bg-violet-800/85 hover:border-violet-300/60"
                          )}
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedTag(selectedTag?.toLowerCase() === tag.toLowerCase() ? null : tag)
                          }}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <div className="absolute top-2 right-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-6 w-6 rounded-full backdrop-blur-sm ${isBookmarked ? "text-amber-400 bg-amber-500/20 hover:bg-amber-500/30" : "text-white/50 bg-black/30 hover:text-amber-400 hover:bg-amber-500/20"}`}
                        onClick={() => handleToggleBookmark(item.id)}
                        title={isBookmarked ? "Remove bookmark" : "Bookmark"}
                      >
                        {isBookmarked
                          ? <BookmarkCheckIcon className="size-3" />
                          : <BookmarkIcon className="size-3" />
                        }
                      </Button>
                    </div>
                    <div className="absolute bottom-2.5 left-3 flex flex-wrap items-center gap-1.5">
                      <Badge
                        className={cn(
                          "text-[9px] font-mono border px-1.5 py-0.5 rounded cursor-pointer transition-all duration-150",
                          selectedFeed === item.feedId
                            ? `${badge} ring-1 ring-white/30 brightness-125`
                            : `${badge} hover:brightness-125`
                        )}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedFeed(selectedFeed === item.feedId ? "all" : item.feedId)
                        }}
                      >
                        {feedName}
                      </Badge>
                      {matchedKeywords.map((kw) => (
                        <Badge
                          key={kw}
                          className={cn(
                            "text-[9px] font-mono border px-1.5 py-0.5 rounded cursor-pointer transition-all duration-150",
                            selectedKeyword === kw
                              ? "bg-amber-500/35 text-amber-300 border-amber-400/60 ring-1 ring-amber-400/40"
                              : "bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/35 hover:text-amber-300"
                          )}
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedKeyword(selectedKeyword === kw ? "all" : kw)
                          }}
                        >
                          {kw}
                        </Badge>
                      ))}
                      {isRead && (
                        <Badge className="text-[9px] font-mono bg-white/10 text-white/50 border border-white/15 px-1.5 py-0.5 rounded">
                          Read
                        </Badge>
                      )}
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
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-[10px] text-muted-foreground tracking-wide">
                        {publishedDate ? format(publishedDate, "do MMM yyyy") : "—"}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-5 w-5 ml-1 ${isRead ? "text-white/30 hover:text-white/60" : "text-white/20 hover:text-white/50"}`}
                        onClick={() => handleToggleRead(item.id)}
                        title={isRead ? "Mark as unread" : "Mark as read"}
                      >
                        <CheckIcon className="size-3" />
                      </Button>
                    </div>
                    {item.url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1.5 px-2 text-[11px] font-mono text-amber-400/80 hover:text-amber-300 hover:bg-amber-500/10"
                        asChild
                        onClick={() => handleReadArticle(item.id)}
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

        {/* ── Pagination bar ── */}
        {!isSearchMode && totalPages > 1 && (
          <div className="mt-10 flex flex-col items-center gap-3">
            <p className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">
              Showing {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, filtered.length)}
              <span className="mx-2 text-white/20">of</span>
              {filtered.length} articles
            </p>
            <Pagination>
              <PaginationContent className="gap-1">
                {/* Previous */}
                <PaginationItem>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => goToPage(currentPage - 1)}
                    className="h-9 gap-1.5 px-3 font-mono text-xs border border-white/15 bg-white/5 hover:bg-white/10 hover:text-amber-400 disabled:opacity-25 disabled:cursor-not-allowed"
                  >
                    <ChevronLeftIcon className="size-3.5" />
                    Prev
                  </Button>
                </PaginationItem>

                {/* Page numbers */}
                {getPageRange(currentPage, totalPages).map((p, idx) =>
                  p === "ellipsis" ? (
                    <PaginationItem key={`ellipsis-${idx}`}>
                      <PaginationEllipsis className="text-muted-foreground size-9" />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={p}>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => goToPage(p)}
                        className={cn(
                          "size-9 font-mono text-xs border",
                          currentPage === p
                            ? "border-amber-500/40 text-amber-400 bg-amber-500/10 hover:bg-amber-500/15"
                            : "border-white/10 text-muted-foreground bg-white/4 hover:bg-white/10 hover:text-foreground"
                        )}
                      >
                        {p}
                      </Button>
                    </PaginationItem>
                  )
                )}

                {/* Next */}
                <PaginationItem>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => goToPage(currentPage + 1)}
                    className="h-9 gap-1.5 px-3 font-mono text-xs border border-white/15 bg-white/5 hover:bg-white/10 hover:text-amber-400 disabled:opacity-25 disabled:cursor-not-allowed"
                  >
                    Next
                    <ChevronRightIcon className="size-3.5" />
                  </Button>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>
    </div>
  )
}
