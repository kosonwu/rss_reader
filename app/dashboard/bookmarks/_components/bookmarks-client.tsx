"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { format, parseISO } from "date-fns"
import {
  ArrowLeftIcon,
  BookmarkCheckIcon,
  CheckIcon,
  ExternalLinkIcon,
  NewspaperIcon,
  TagIcon,
} from "lucide-react"
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
import DashboardNav from "@/app/dashboard/_components/dashboard-nav"
import { markAsReadAction, markAsUnreadAction, toggleBookmarkAction } from "../../actions"
import { createKeywordAction } from "../../keywords/actions"
import { stripHtml } from "@/lib/utils"

// ── Types ──────────────────────────────────────────────────────────────────────

type Feed = {
  id: string
  title: string | null
  url: string
}

type Bookmark = {
  id: string
  feedId: string
  title: string | null
  description: string | null
  url: string | null
  ogImageUrl: string | null
  publishedAt: string | null
  bookmarkedAt: string
  displayTags: string[] | null
  readingTimeMinutes: number
  isRead: boolean
}

type Keyword = {
  id: string
  keyword: string
}

type TopTag = {
  tag: string
  freq: number
  type: string
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

// ── Main component ─────────────────────────────────────────────────────────────

export default function BookmarksClient({
  bookmarks,
  feeds,
  feedsCount,
  keywords,
  subscriptionsCount,
  keywordsCount,
  topTags = [],
}: {
  bookmarks: Bookmark[]
  feeds: Feed[]
  feedsCount: number
  keywords: Keyword[]
  subscriptionsCount: number
  keywordsCount: number
  topTags?: TopTag[]
}) {
  const [, startTransition] = useTransition()
  const [, startKeywordTransition] = useTransition()
  const [addedTags, setAddedTags] = useState<Set<string>>(() =>
    new Set(keywords.map((kw) => kw.keyword.toLowerCase()))
  )

  const [readIds, setReadIds] = useState<Set<string>>(
    () => new Set(bookmarks.filter((b) => b.isRead).map((b) => b.id)),
  )
  const [removedIds, setRemovedIds] = useState<Set<string>>(() => new Set())

  const feedIndexMap = new Map(feeds.map((f, i) => [f.id, i]))

  function handleReadArticle(itemId: string) {
    if (!readIds.has(itemId)) {
      setReadIds((prev) => new Set(prev).add(itemId))
      startTransition(() => {
        markAsReadAction({ feedItemId: itemId })
      })
    }
  }

  function handleToggleRead(itemId: string) {
    if (readIds.has(itemId)) {
      setReadIds((prev) => {
        const next = new Set(prev)
        next.delete(itemId)
        return next
      })
      startTransition(() => {
        markAsUnreadAction({ feedItemId: itemId })
      })
    } else {
      setReadIds((prev) => new Set(prev).add(itemId))
      startTransition(() => {
        markAsReadAction({ feedItemId: itemId })
      })
    }
  }

  function handleRemoveBookmark(itemId: string) {
    setRemovedIds((prev) => new Set(prev).add(itemId))
    startTransition(() => {
      toggleBookmarkAction({ feedItemId: itemId, isCurrentlyBookmarked: true })
    })
  }

  function handleAddTagAsKeyword(tag: string) {
    setAddedTags((prev) => new Set(prev).add(tag.toLowerCase()))
    startKeywordTransition(async () => {
      const result = await createKeywordAction({ keyword: tag, isCaseSensitive: false, source: "tag" })
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success(`Saved '${tag}' as keyword`)
      }
    })
  }

  function getMatchedKeywords(item: Bookmark): string[] {
    const text = `${item.title ?? ""} ${item.description ?? ""}`.toLowerCase()
    return keywords
      .filter((kw) => text.includes(kw.keyword.toLowerCase()))
      .map((kw) => kw.keyword)
  }

  const visible = bookmarks.filter((b) => !removedIds.has(b.id))

  return (
    <div className="dark min-h-screen bg-[oklch(0.09_0_0)] text-foreground">

      {/* ── Header ── */}
      <div className="border-b border-white/8 px-6 py-7 lg:px-10">
        <div className="max-w-7xl mx-auto flex items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BookmarkCheckIcon className="size-4 text-amber-400" />
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
              Bookmarks
            </h1>
            <p className="text-xs font-mono text-muted-foreground mt-2 tracking-wide">
              {visible.length} {visible.length === 1 ? "saved article" : "saved articles"}
            </p>
          </div>

          <div className="flex items-end gap-4 shrink-0">
            <DashboardNav
              feedsCount={feedsCount}
              subscriptionsCount={subscriptionsCount}
              keywordsCount={keywordsCount}
              bookmarksCount={visible.length}
              activePage="bookmarks"
            />
          </div>
        </div>
      </div>

      {/* ── Top tags from user profile ── */}
      {topTags.length > 0 && (
        <div className="border-b border-white/8 px-6 py-4 lg:px-10">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground tracking-[0.15em] uppercase shrink-0 mr-1">
              Your Interests
            </span>
            {topTags.map(({ tag }) => {
              const isAdded = addedTags.has(tag.toLowerCase())
              return (
                <button
                  key={tag}
                  type="button"
                  disabled={isAdded}
                  onClick={() => !isAdded && handleAddTagAsKeyword(tag)}
                  title={isAdded ? `'${tag}' already saved as keyword` : `Save '${tag}' as keyword`}
                  className={`flex items-center gap-1.5 h-7 rounded-md border px-2.5 font-mono text-xs transition-colors duration-150 ${
                    isAdded
                      ? "bg-violet-500/15 border-violet-400/30 text-violet-300/50 cursor-default"
                      : "bg-violet-500/15 border-violet-400/30 text-violet-300 hover:bg-violet-500/25 hover:border-violet-400/50 cursor-pointer"
                  }`}
                >
                  <span>{tag}</span>
                  {isAdded
                    ? <CheckIcon className="size-3 opacity-60" />
                    : <TagIcon className="size-3" />
                  }
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Article grid ── */}
      <div className="max-w-7xl mx-auto px-6 py-8 lg:px-10">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-muted-foreground gap-4">
            <NewspaperIcon className="size-14 opacity-10" />
            <p className="font-mono text-sm">No bookmarks yet.</p>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs font-mono text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
              asChild
            >
              <Link href="/dashboard">← Back to Dashboard</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visible.map((item) => {
              const feedIdx = feedIndexMap.get(item.feedId) ?? 0
              const { gradient, badge } = feedStyle(feedIdx)
              const feed = feeds.find((f) => f.id === item.feedId)
              const feedName = feed?.title ?? feed?.url ?? "Unknown Feed"
              const matchedKeywords = getMatchedKeywords(item)
              const publishedDate = item.publishedAt ? parseISO(item.publishedAt) : null
              const isRead = readIds.has(item.id)

              return (
                <Card
                  key={item.id}
                  className={`group border-white/8 hover:border-amber-500/35 transition-all duration-300 bg-white/4 hover:bg-white/6 gap-0 py-0 ${isRead ? "opacity-50 grayscale" : ""}`}
                >
                  <div className="h-36 relative overflow-hidden rounded-t-xl">
                    {item.ogImageUrl ? (
                      <img src={item.ogImageUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-br ${gradient}`} />
                    )}
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_70%_20%,rgba(255,255,255,0.06),transparent)]" />
                    {/* Display tags — top-left */}
                    {item.displayTags && item.displayTags.length > 0 && (
                      <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                        {[...item.displayTags].sort((a, b) => a.length - b.length).slice(0, 5).map((tag) => (
                          <Badge
                            key={tag}
                            className="text-[9px] font-mono bg-violet-950/80 text-violet-200 border-violet-700/40 border px-1.5 py-0.5 rounded"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {/* Remove bookmark — top-right */}
                    <div className="absolute top-2 right-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-full backdrop-blur-sm text-amber-400 bg-amber-500/20 hover:bg-red-500/20 hover:text-red-400"
                        onClick={() => handleRemoveBookmark(item.id)}
                        title="Remove bookmark"
                      >
                        <BookmarkCheckIcon className="size-3" />
                      </Button>
                    </div>
                    {/* Reading time — bottom-right */}
                    <div className="absolute bottom-2 right-2">
                      <Badge className="text-[9px] font-mono bg-black/40 text-white/70 border border-white/15 px-1.5 py-0.5 rounded backdrop-blur-sm">
                        {item.readingTimeMinutes > 10 ? "10+ 分鐘" : `${item.readingTimeMinutes} 分鐘`}
                      </Badge>
                    </div>
                    {/* Feed + keyword + read badges — bottom-left */}
                    <div className="absolute bottom-2.5 left-3 flex flex-wrap items-center gap-1.5">
                      <Badge className={`text-[9px] font-mono border px-1.5 py-0.5 rounded ${badge}`}>
                        {feedName}
                      </Badge>
                      {matchedKeywords.map((kw) => (
                        <Badge
                          key={kw}
                          className="text-[9px] font-mono border px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-200 border-emerald-400/40 backdrop-blur-sm"
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
                      {stripHtml(item.description)}
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
      </div>
    </div>
  )
}
