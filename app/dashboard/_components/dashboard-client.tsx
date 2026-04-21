"use client"

import { useState, useEffect, useRef, useTransition } from "react"
import { useRouter, usePathname } from "next/navigation"
import { format, parseISO } from "date-fns"
import {
  BookmarkIcon,
  BookmarkCheckIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  RssIcon,
  FlaskConicalIcon,
  TagIcon,
  ExternalLinkIcon,
  FilterIcon,
  NewspaperIcon,
  Loader2Icon,
  CheckIcon,
  XIcon,
  AlertCircleIcon,
  ArrowLeftRightIcon,
  ChevronsUpDownIcon,
  SearchIcon,
  SparklesIcon,
  BrainCircuitIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { markAsReadAction, markAsUnreadAction, toggleBookmarkAction, bulkBookmarkByTagAction } from "../actions"
import { createKeywordAction } from "@/app/dashboard/keywords/actions"
import { toast } from "sonner"
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from "@/components/ui/pagination"
import DashboardNav from "@/app/dashboard/_components/dashboard-nav"
import type { FeedStatusCounts } from "@/data/feeds"

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
  content: string | null
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
  isCaseSensitive: boolean
}

// ── Pagination ─────────────────────────────────────────────────────────────────

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
  "bg-emerald-950/80 text-emerald-300 border-emerald-500/45",
  "bg-orange-950/80 text-orange-300 border-orange-500/45",
  "bg-red-950/80 text-red-300 border-red-500/45",
  "bg-blue-950/80 text-blue-300 border-blue-500/45",
  "bg-cyan-950/80 text-cyan-300 border-cyan-500/45",
  "bg-violet-950/80 text-violet-300 border-violet-500/45",
  "bg-fuchsia-950/80 text-fuchsia-300 border-fuchsia-500/45",
  "bg-amber-950/80 text-amber-300 border-amber-500/45",
]

function feedStyle(feedIndex: number) {
  const i = feedIndex % GRADIENT_PALETTE.length
  return { gradient: GRADIENT_PALETTE[i], badge: BADGE_PALETTE[i] }
}

// ── Feed Combobox ──────────────────────────────────────────────────────────────

function FeedCombobox({
  feeds,
  value,
  onChange,
}: {
  feeds: Feed[]
  value: string
  onChange: (feedId: string | undefined) => void
}) {
  const [open, setOpen] = useState(false)
  const sorted = [...feeds].sort((a, b) => (a.title ?? a.url).localeCompare(b.title ?? b.url))
  const selected = sorted.find((f) => f.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-9 min-w-[170px] justify-between font-mono text-xs border-white/15 bg-white/5 hover:bg-white/10 gap-2"
        >
          <RssIcon className="size-3.5 text-amber-400 shrink-0" />
          <span className="truncate flex-1 text-left">
            {selected ? (selected.title ?? selected.url) : "All Feeds"}
          </span>
          <ChevronsUpDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="dark w-[280px] p-0 bg-[oklch(0.13_0_0)] border-white/15 shadow-xl shadow-black/50" align="start">
        <Command className="bg-transparent">
          <CommandInput
            placeholder="Search feeds..."
            className="font-mono text-xs h-9 text-foreground placeholder:text-muted-foreground"
          />
          <CommandList>
            <CommandEmpty className="font-mono text-xs text-muted-foreground py-4 text-center">
              No feed found.
            </CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="all"
                onSelect={() => { onChange(undefined); setOpen(false) }}
                className="font-mono text-xs text-foreground data-selected:bg-white/8 data-selected:text-foreground rounded-md"
              >
                <CheckIcon className={`mr-2 size-3.5 text-amber-400 ${value === "all" ? "opacity-100" : "opacity-0"}`} />
                All Feeds
              </CommandItem>
              {sorted.map((feed) => (
                <CommandItem
                  key={feed.id}
                  value={feed.title ?? feed.url}
                  onSelect={() => { onChange(feed.id); setOpen(false) }}
                  className="font-mono text-xs text-foreground data-selected:bg-white/8 data-selected:text-foreground rounded-md"
                >
                  <CheckIcon className={`mr-2 size-3.5 text-amber-400 ${value === feed.id ? "opacity-100" : "opacity-0"}`} />
                  {feed.title ?? feed.url}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// ── Keyword Combobox ───────────────────────────────────────────────────────────

function KeywordCombobox({
  keywords,
  value,
  onChange,
}: {
  keywords: Keyword[]
  value: string
  onChange: (keyword: string | undefined) => void
}) {
  const [open, setOpen] = useState(false)
  const sorted = [...keywords].sort((a, b) => a.keyword.localeCompare(b.keyword))
  const selected = sorted.find((kw) => kw.keyword === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-9 min-w-[170px] justify-between font-mono text-xs border-white/15 bg-white/5 hover:bg-white/10 gap-2"
        >
          <TagIcon className="size-3.5 text-amber-400 shrink-0" />
          <span className="truncate flex-1 text-left">
            {selected ? selected.keyword : "All Keywords"}
          </span>
          <ChevronsUpDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="dark w-[280px] p-0 bg-[oklch(0.13_0_0)] border-white/15 shadow-xl shadow-black/50" align="start">
        <Command className="bg-transparent">
          <CommandInput
            placeholder="Search keywords..."
            className="font-mono text-xs h-9 text-foreground placeholder:text-muted-foreground"
          />
          <CommandList>
            <CommandEmpty className="font-mono text-xs text-muted-foreground py-4 text-center">
              No keyword found.
            </CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="all"
                onSelect={() => { onChange(undefined); setOpen(false) }}
                className="font-mono text-xs text-foreground data-selected:bg-white/8 data-selected:text-foreground rounded-md"
              >
                <CheckIcon className={`mr-2 size-3.5 text-amber-400 ${value === "all" ? "opacity-100" : "opacity-0"}`} />
                All Keywords
              </CommandItem>
              {sorted.map((kw) => (
                <CommandItem
                  key={kw.id}
                  value={kw.keyword}
                  onSelect={() => { onChange(kw.keyword); setOpen(false) }}
                  className="font-mono text-xs text-foreground data-selected:bg-white/8 data-selected:text-foreground rounded-md"
                >
                  <CheckIcon className={`mr-2 size-3.5 text-amber-400 ${value === kw.keyword ? "opacity-100" : "opacity-0"}`} />
                  {kw.keyword}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// ── DatePicker sub-component ───────────────────────────────────────────────────

function DatePicker({
  date,
  onSelect,
  onCommit,
  label,
  error,
}: {
  date: Date
  onSelect: (d: Date) => void
  onCommit: () => void
  label: string
  error?: boolean
}) {
  return (
    <Popover onOpenChange={(open) => { if (!open) onCommit() }}>
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
      <PopoverContent className="dark w-auto p-0 bg-[oklch(0.13_0_0)] border-white/15 shadow-xl shadow-black/50" align="start">
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
  feedsStatusCounts,
  feedItems,
  keywords,
  subscriptionsCount,
  bookmarksCount,
  totalCount,
  totalPages,
  currentPage,
  pageSize,
  dateFrom: datFromStr,
  dateTo: datToStr,
  selectedFeed,
  selectedKeyword,
  selectedTag,
  isInvalidDateRange,
  sort,
  searchQuery,
}: {
  feeds: Feed[]
  feedsCount: number
  feedsStatusCounts: FeedStatusCounts
  feedItems: FeedItem[]
  keywords: Keyword[]
  subscriptionsCount: number
  bookmarksCount: number
  totalCount: number
  totalPages: number
  currentPage: number
  pageSize: number
  dateFrom: string
  dateTo: string
  selectedFeed: string
  selectedKeyword: string
  selectedTag: string | null
  isInvalidDateRange: boolean
  sort: "date" | "preference"
  searchQuery: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [, startTransition] = useTransition()
  const [isSavingTag, startSaveTagTransition] = useTransition()
  const [isBulkBookmarking, startBulkBookmarkTransition] = useTransition()
  const [localSavedTags, setLocalSavedTags] = useState<Set<string>>(new Set())
  const knownCount = useRef(totalCount)

  // Optimistic state — merge new page items into existing sets (never reset)
  const [readIds, setReadIds] = useState<Set<string>>(
    () => new Set(feedItems.filter((i) => i.isRead).map((i) => i.id))
  )
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(
    () => new Set(feedItems.filter((i) => i.isBookmarked).map((i) => i.id))
  )

  // Merge server read/bookmark state on every page change
  useEffect(() => {
    setReadIds((prev) => {
      const next = new Set(prev)
      feedItems.forEach((item) => { if (item.isRead) next.add(item.id) })
      return next
    })
    setBookmarkedIds((prev) => {
      const next = new Set(prev)
      feedItems.forEach((item) => { if (item.isBookmarked) next.add(item.id) })
      return next
    })
  }, [feedItems])

  // Keep knownCount in sync with totalCount from server
  useEffect(() => { knownCount.current = totalCount }, [totalCount])

  // Local date state for DatePicker preview (URL updated only on popover close)
  const [localDateFrom, setLocalDateFrom] = useState<Date>(() => parseISO(datFromStr))
  const [localDateTo, setLocalDateTo] = useState<Date>(() => parseISO(datToStr))

  // Sync local dates when URL-derived props change (e.g. browser back/forward)
  useEffect(() => { setLocalDateFrom(parseISO(datFromStr)) }, [datFromStr])
  useEffect(() => { setLocalDateTo(parseISO(datToStr)) }, [datToStr])

  // Local input state for semantic search bar
  const [searchInputValue, setSearchInputValue] = useState(searchQuery)
  useEffect(() => { setSearchInputValue(searchQuery) }, [searchQuery])

  // Semantic search state — query driven by URL ?q= prop
  const [searchItems, setSearchItems] = useState<FeedItem[] | null>(null)
  const [isSearching, setIsSearching] = useState<boolean>(false)

  useEffect(() => {
    if (!searchQuery) { setSearchItems(null); return }
    runSearch(searchQuery)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery])

  // Background polling: refresh if new articles arrive
  useEffect(() => {
    const POLL_INTERVAL = 60_000
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

  // ── URL helpers ────────────────────────────────────────────────────────────

  const todayStr = format(new Date(), "yyyy-MM-dd")

  const isTagAlreadySaved = selectedTag
    ? localSavedTags.has(selectedTag.toLowerCase()) ||
      keywords.some((k) => k.keyword.toLowerCase() === selectedTag.toLowerCase())
    : false

  function updateUrl(overrides: {
    from?: string
    to?: string
    feed?: string | undefined
    keyword?: string | undefined
    tag?: string | null
    page?: number
  }) {
    const from = overrides.from ?? datFromStr
    const to = overrides.to ?? datToStr
    const feed = "feed" in overrides ? overrides.feed : (selectedFeed !== "all" ? selectedFeed : undefined)
    const keyword = "keyword" in overrides ? overrides.keyword : (selectedKeyword !== "all" ? selectedKeyword : undefined)
    const tag = "tag" in overrides ? overrides.tag : selectedTag
    const page = overrides.page ?? 1  // filter changes always reset to page 1

    const p = new URLSearchParams()
    if (from !== todayStr) p.set("from", from)
    if (to !== todayStr) p.set("to", to)
    if (feed) p.set("feed", feed)
    if (keyword) p.set("keyword", keyword)
    if (tag) p.set("tag", tag)
    if (page > 1) p.set("page", String(page))

    if (searchQuery) p.set("q", searchQuery)
    const qs = p.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname)
  }

  function goToPage(page: number) {
    const p = new URLSearchParams()
    if (datFromStr !== todayStr) p.set("from", datFromStr)
    if (datToStr !== todayStr) p.set("to", datToStr)
    if (selectedFeed !== "all") p.set("feed", selectedFeed)
    if (selectedKeyword !== "all") p.set("keyword", selectedKeyword)
    if (selectedTag) p.set("tag", selectedTag)
    if (sort === "preference") p.set("sort", "preference")
    if (searchQuery) p.set("q", searchQuery)
    if (page > 1) p.set("page", String(page))

    const qs = p.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  // ── Semantic search ────────────────────────────────────────────────────────

  async function runSearch(query: string) {
    setIsSearching(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
      if (!res.ok) { setSearchItems([]); return }
      const items: FeedItem[] = await res.json()
      setSearchItems(items)
      const newRead = items.filter((i) => i.isRead).map((i) => i.id)
      const newBm = items.filter((i) => i.isBookmarked).map((i) => i.id)
      if (newRead.length) setReadIds((p) => new Set([...p, ...newRead]))
      if (newBm.length) setBookmarkedIds((p) => new Set([...p, ...newBm]))
    } catch {
      setSearchItems([])
    } finally {
      setIsSearching(false)
    }
  }

  // ── Optimistic action handlers ─────────────────────────────────────────────

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

  function handleBulkBookmarkByTag() {
    if (!selectedTag || isBulkBookmarking) return
    startBulkBookmarkTransition(async () => {
      const result = await bulkBookmarkByTagAction({ tag: selectedTag, dateFrom: datFromStr, dateTo: datToStr })
      if (result?.error) {
        toast.error(result.error)
      } else if (result?.count === 0) {
        toast.info(`All '${selectedTag}' articles already bookmarked`)
      } else {
        toast.success(`Bookmarked ${result.count} '${selectedTag}' articles`)
      }
    })
  }

  function handleSaveTagAsKeyword() {
    if (!selectedTag || isTagAlreadySaved) return
    startSaveTagTransition(async () => {
      const result = await createKeywordAction({
        keyword: selectedTag,
        isCaseSensitive: false,
        source: "tag",
      })
      if (result?.error === "Keyword already exists") {
        toast.info(`'${selectedTag}' is already saved as a keyword`)
      } else if (result?.error) {
        toast.error(result.error)
      } else {
        setLocalSavedTags((prev) => new Set(prev).add(selectedTag.toLowerCase()))
        toast.success(`Saved '${selectedTag}' as keyword`)
      }
    })
  }

  function commitSearch(value: string) {
    const trimmed = value.trim()
    const p = new URLSearchParams()
    if (datFromStr !== todayStr) p.set("from", datFromStr)
    if (datToStr !== todayStr) p.set("to", datToStr)
    if (selectedFeed !== "all") p.set("feed", selectedFeed)
    if (selectedKeyword !== "all") p.set("keyword", selectedKeyword)
    if (selectedTag) p.set("tag", selectedTag)
    if (sort === "preference") p.set("sort", "preference")
    if (trimmed) p.set("q", trimmed)
    const qs = p.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname)
  }

  function clearSearch() {
    setSearchInputValue("")
    commitSearch("")
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") commitSearch(searchInputValue)
    if (e.key === "Escape") clearSearch()
  }

  function toggleSort(checked: boolean) {
    const p = new URLSearchParams()
    if (datFromStr !== todayStr) p.set("from", datFromStr)
    if (datToStr !== todayStr) p.set("to", datToStr)
    if (selectedFeed !== "all") p.set("feed", selectedFeed)
    if (selectedKeyword !== "all") p.set("keyword", selectedKeyword)
    if (selectedTag) p.set("tag", selectedTag)
    if (checked) p.set("sort", "preference")
    if (searchQuery) p.set("q", searchQuery)
    const qs = p.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname)
  }

  function handleResetDashboard() {
    setSearchItems(null)
    router.replace(pathname)
  }

  function handleSwapDates() {
    const newFrom = datToStr
    const newTo = datFromStr
    setLocalDateFrom(parseISO(newFrom))
    setLocalDateTo(parseISO(newTo))
    updateUrl({ from: newFrom, to: newTo })
  }

  // ── Derived display values ─────────────────────────────────────────────────

  const feedIndexMap = new Map(feeds.map((f, i) => [f.id, i]))
  const isSearchMode = searchQuery.length > 0
  const displayItems = isSearchMode ? (searchItems ?? []) : feedItems
  const articleCount = isSearchMode ? displayItems.length : totalCount

  // Keyword badge highlight (client-side, display only — not used for filtering)
  function getMatchedKeywords(item: FeedItem): string[] {
    const text = `${item.title ?? ""} ${item.description ?? ""} ${item.content ?? ""}`.toLowerCase()
    return keywords
      .filter((kw) => {
        if (kw.isCaseSensitive) {
          return `${item.title ?? ""} ${item.description ?? ""} ${item.content ?? ""}`.includes(kw.keyword)
        }
        return text.includes(kw.keyword.toLowerCase())
      })
      .map((kw) => kw.keyword)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="dark min-h-screen bg-[oklch(0.09_0_0)] text-foreground">

      {/* ── Header ── */}
      <div className="border-b border-white/8 px-6 py-7 lg:px-10">
        <div className="max-w-7xl mx-auto flex items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FlaskConicalIcon className="size-4 text-amber-400" />
              <span className="text-[10px] font-mono text-amber-400 tracking-[0.25em] uppercase">
                Distill
              </span>
            </div>
            <h1 className="text-[2.2rem] font-[family-name:var(--font-playfair)] font-bold tracking-tight leading-none">
              <button onClick={handleResetDashboard} className="hover:text-amber-400 transition-colors duration-200 cursor-pointer">
                Dashboard
              </button>
            </h1>
            <p className={cn("text-xs font-mono mt-2 tracking-wide", isInvalidDateRange ? "text-red-400" : "text-muted-foreground")}>
              {format(localDateFrom, "do MMM yyyy")}
              <span className={cn("mx-2", isInvalidDateRange ? "text-red-500/50" : "text-white/20")}>—</span>
              {format(localDateTo, "do MMM yyyy")}
            </p>
          </div>

          <div className="flex items-end gap-6 shrink-0">
            <DashboardNav
              feedsCount={feedsCount}
              feedsStatusCounts={feedsStatusCounts}
              subscriptionsCount={subscriptionsCount}
              keywordsCount={keywords.length}
              bookmarksCount={bookmarksCount}
            />

            <div className="text-right">
              <div className="text-[1.8rem] font-mono font-light text-amber-400 leading-none tabular-nums">
                {articleCount}
              </div>
              <div className="text-[9px] text-muted-foreground mt-1 tracking-widest uppercase font-mono">
                {articleCount === 1 ? "article" : "articles"}
              </div>
              {!isSearchMode && totalPages > 1 && (
                <div className="text-[9px] font-mono text-white/25 mt-0.5 tracking-widest">
                  pg {currentPage}/{totalPages}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="sticky top-0 z-20 border-b border-white/8 bg-[oklch(0.09_0_0)]/92 backdrop-blur-xl px-6 lg:px-10">

        {/* Row 1: main filters — never wraps, never shifts */}
        <div className="max-w-7xl mx-auto flex items-center gap-2.5 py-3">
          <FilterIcon className="size-3.5 text-muted-foreground shrink-0 mr-0.5" />

          <DatePicker
            date={localDateFrom}
            onSelect={setLocalDateFrom}
            onCommit={() => updateUrl({ from: format(localDateFrom, "yyyy-MM-dd"), to: format(localDateTo, "yyyy-MM-dd") })}
            label="From"
            error={isInvalidDateRange}
          />
          <DatePicker
            date={localDateTo}
            onSelect={setLocalDateTo}
            onCommit={() => updateUrl({ from: format(localDateFrom, "yyyy-MM-dd"), to: format(localDateTo, "yyyy-MM-dd") })}
            label="To"
            error={isInvalidDateRange}
          />

          <Separator orientation="vertical" className="h-7 bg-white/10 mx-1" />

          {/* Feed combobox */}
          <FeedCombobox
            feeds={feeds}
            value={selectedFeed}
            onChange={(feedId) => updateUrl({ feed: feedId })}
          />

          {/* Keyword combobox */}
          <KeywordCombobox
            keywords={keywords}
            value={selectedKeyword}
            onChange={(keyword) => updateUrl({ keyword })}
          />

          {/* ── Right side: Semantic Search + Smart Sort ── */}
          <div className="ml-auto flex items-center gap-3 shrink-0">

            {/* Semantic Search input */}
            <div className="relative flex items-center">
              <SearchIcon className="absolute left-2.5 size-3.5 text-amber-400 pointer-events-none z-10" />
              <input
                type="text"
                placeholder="Semantic search… ↵"
                value={searchInputValue}
                onChange={(e) => setSearchInputValue(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="h-9 pl-8 pr-7 w-[210px] rounded-md font-mono text-xs text-white/90 placeholder:text-white/45 border border-amber-500/30 bg-white/5 hover:bg-white/8 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/20 transition-colors"
              />
              {searchInputValue && (
                <button
                  onClick={clearSearch}
                  className="absolute right-2 text-white/35 hover:text-white/70 transition-colors"
                  aria-label="Clear search"
                >
                  <XIcon className="size-3" />
                </button>
              )}
              {isSearching && (
                <Loader2Icon className="absolute right-2 size-3 text-amber-400 animate-spin pointer-events-none" />
              )}
              {searchQuery && !isSearching && (
                <div className="absolute -top-1.5 -right-1.5 flex items-center gap-0.5 text-[8px] font-mono bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1 py-0.5 rounded pointer-events-none">
                  <BrainCircuitIcon className="size-2.5" />
                  semantic
                </div>
              )}
            </div>

            <Separator orientation="vertical" className="h-7 bg-white/10" />

            {/* Smart Sort toggle */}
            <div className="flex items-center gap-2">
              <label
                htmlFor="pref-sort"
                className={`flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.18em] cursor-pointer select-none transition-colors ${
                  sort === "preference" ? "text-amber-400" : "text-white/55"
                }`}
              >
                <SparklesIcon className="size-3 text-amber-400 shrink-0" />
                Smart Sort
              </label>
              <Switch
                id="pref-sort"
                checked={sort === "preference"}
                onCheckedChange={toggleSort}
                className="data-[state=checked]:bg-amber-500 data-[state=unchecked]:bg-white/20"
              />
            </div>
          </div>
        </div>

        {/* Row 2: active tag chip — own row, only visible when a tag is selected */}
        {selectedTag && (
          <div className="border-t border-white/6 max-w-7xl mx-auto flex items-center gap-2.5 py-1.5">
            <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-white/30 shrink-0">Tag</span>
            <div className="flex items-center h-7 gap-0 rounded-md border bg-violet-500/15 border-violet-400/30 px-2 font-mono text-xs text-violet-300">
              {/* Bulk bookmark all articles with this tag */}
              <button
                type="button"
                disabled={isBulkBookmarking}
                onClick={handleBulkBookmarkByTag}
                title={`Bookmark all articles tagged '${selectedTag}'`}
                aria-label={`Bookmark all articles tagged '${selectedTag}'`}
                className="shrink-0 rounded p-0.5 mr-1 text-violet-400 hover:text-violet-200 hover:bg-violet-500/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isBulkBookmarking
                  ? <Loader2Icon className="size-3 animate-spin" />
                  : <BookmarkIcon className="size-3" />
                }
              </button>
              <span className="mr-1.5">{selectedTag}</span>

              {/* Save as keyword */}
              <button
                type="button"
                disabled={isTagAlreadySaved || isSavingTag}
                onClick={handleSaveTagAsKeyword}
                title={isTagAlreadySaved ? `'${selectedTag}' already saved as keyword` : `Save '${selectedTag}' as keyword`}
                aria-label={isTagAlreadySaved ? `'${selectedTag}' already saved as keyword` : `Save '${selectedTag}' as keyword`}
                className={cn(
                  "shrink-0 rounded p-0.5 transition-colors",
                  isTagAlreadySaved
                    ? "text-violet-400 opacity-60 cursor-default"
                    : "text-violet-400 hover:text-violet-200 hover:bg-violet-500/25"
                )}
              >
                {isSavingTag
                  ? <Loader2Icon className="size-3 animate-spin" />
                  : isTagAlreadySaved
                    ? <CheckIcon className="size-3" />
                    : <TagIcon className="size-3" />
                }
              </button>

              {/* Clear filter */}
              <button
                type="button"
                onClick={() => updateUrl({ tag: null })}
                aria-label="Clear tag filter"
                className="shrink-0 rounded p-0.5 ml-0.5 text-violet-400 opacity-60 hover:opacity-100 hover:text-violet-200 hover:bg-violet-500/25 transition-colors"
              >
                <XIcon className="size-3" />
              </button>
            </div>
          </div>
        )}
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
                onClick={() => router.replace(pathname)}
              >
                Clear all filters
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayItems.map((item) => {
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
                      <img src={item.ogImageUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-br ${gradient}`} />
                    )}
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_70%_20%,rgba(255,255,255,0.06),transparent)]" />
                    {/* Bottom scrim — ensures badge legibility over any image */}
                    <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/70 to-transparent pointer-events-none rounded-b-none" />

                    {/* Top-left: display tags */}
                    <div className="absolute top-2 left-2 right-10 flex items-start gap-1 flex-wrap">
                      {item.displayTags?.slice().sort((a, b) => a.length - b.length).slice(0, 5).map((tag) => (
                        <Badge
                          key={tag}
                          title={`View articles tagged "${tag}"`}
                          className={cn(
                            "text-[9px] font-mono px-1.5 py-0.5 rounded backdrop-blur-sm cursor-pointer transition-all duration-150",
                            selectedTag?.toLowerCase() === tag.toLowerCase()
                              ? "bg-violet-700/90 text-violet-100 border border-violet-300/70 ring-1 ring-violet-400/50"
                              : "bg-violet-950/80 text-violet-200 border border-violet-400/40 hover:bg-violet-800/85 hover:border-violet-300/60"
                          )}
                          onClick={(e) => {
                            e.stopPropagation()
                            updateUrl({ tag: selectedTag?.toLowerCase() === tag.toLowerCase() ? null : tag })
                          }}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    {/* Top-right: bookmark button */}
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

                    {/* Bottom-right: reading time */}
                    <div className="absolute bottom-2.5 right-2">
                      <Badge className="text-[9px] font-mono bg-black/40 text-white/70 border border-white/15 px-1.5 py-0.5 rounded backdrop-blur-sm">
                        {item.readingTimeMinutes > 10 ? "10+ 分鐘" : `${item.readingTimeMinutes} 分鐘`}
                      </Badge>
                    </div>

                    {/* Bottom-left: feed badge + keyword badges + read badge */}
                    <div className="absolute bottom-2.5 left-3 flex flex-wrap items-center gap-1.5">
                      <Badge
                        title={`View articles from '${feedName}'`}
                        className={cn(
                          "text-[9px] font-mono border px-1.5 py-0.5 rounded cursor-pointer transition-all duration-150 backdrop-blur-sm",
                          selectedFeed === item.feedId
                            ? `${badge} ring-1 ring-white/30 brightness-125`
                            : `${badge} hover:brightness-125`
                        )}
                        onClick={(e) => {
                          e.stopPropagation()
                          updateUrl({ feed: selectedFeed === item.feedId ? undefined : item.feedId })
                        }}
                      >
                        {feedName}
                      </Badge>
                      {matchedKeywords.map((kw) => (
                        <Badge
                          key={kw}
                          title={`View articles containing keyword "${kw}"`}
                          className={cn(
                            "text-[9px] font-mono border px-1.5 py-0.5 rounded cursor-pointer transition-all duration-150",
                            selectedKeyword === kw
                              ? "bg-emerald-700/90 text-emerald-100 border border-emerald-300/70 ring-1 ring-emerald-400/50 backdrop-blur-sm"
                              : "bg-emerald-950/80 text-emerald-200 border border-emerald-400/40 hover:bg-emerald-800/85 hover:border-emerald-300/60 backdrop-blur-sm"
                          )}
                          onClick={(e) => {
                            e.stopPropagation()
                            updateUrl({ keyword: selectedKeyword === kw ? undefined : kw })
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
              Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, totalCount)}
              <span className="mx-2 text-white/20">of</span>
              {totalCount} articles
            </p>
            <Pagination>
              <PaginationContent className="gap-1">
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
