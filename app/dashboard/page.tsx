"use client"

import { useState } from "react"
import { format, startOfMonth, isWithinInterval } from "date-fns"
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

// ── Mock Data ──────────────────────────────────────────────────────────────────

const FEEDS = [
  { id: "techcrunch", name: "TechCrunch" },
  { id: "hackernews", name: "Hacker News" },
  { id: "theverge", name: "The Verge" },
  { id: "arstechnica", name: "Ars Technica" },
]

const KEYWORDS = ["AI", "JavaScript", "Open Source", "Security", "React"]

const ARTICLES = [
  {
    id: "1",
    feedId: "techcrunch",
    title: "OpenAI's o3 Surpasses Human-Level Performance on Math Olympiad",
    excerpt:
      "The latest reasoning model demonstrates unprecedented capabilities, achieving gold medal performance on the International Mathematical Olympiad for the first time in AI history.",
    date: new Date(2026, 3, 6),
    keywords: ["AI"],
    gradient: "from-emerald-950 via-emerald-900 to-slate-900",
  },
  {
    id: "2",
    feedId: "hackernews",
    title: "Show HN: Open-source Notion alternative with offline-first sync",
    excerpt:
      "After two years of development, this fully open-source workspace tool supports real-time collaboration, offline editing, and end-to-end encryption by default.",
    date: new Date(2026, 3, 5),
    keywords: ["Open Source"],
    gradient: "from-orange-950 via-orange-900 to-slate-900",
  },
  {
    id: "3",
    feedId: "theverge",
    title: "Apple Vision Pro 2 Review: Spatial Computing Finally Arrives",
    excerpt:
      "With a lighter form factor, all-day battery life, and a dramatically improved software ecosystem, the second generation Vision Pro makes a compelling case.",
    date: new Date(2026, 3, 4),
    keywords: [],
    gradient: "from-red-950 via-red-900 to-slate-900",
  },
  {
    id: "4",
    feedId: "arstechnica",
    title: "Critical Zero-Day Found in Linux Kernel's Network Stack",
    excerpt:
      "Security researchers have discovered a remote code execution vulnerability affecting all Linux kernel versions since 5.10, with millions of servers potentially at risk.",
    date: new Date(2026, 3, 4),
    keywords: ["Security"],
    gradient: "from-blue-950 via-blue-900 to-slate-900",
  },
  {
    id: "5",
    feedId: "techcrunch",
    title: "React 20 Ships with Native Signals and Concurrent Server Components",
    excerpt:
      "The Meta-led open source framework reaches a landmark milestone with built-in signal primitives, eliminating the need for external state management in most applications.",
    date: new Date(2026, 3, 3),
    keywords: ["JavaScript", "React"],
    gradient: "from-cyan-950 via-cyan-900 to-slate-900",
  },
  {
    id: "6",
    feedId: "hackernews",
    title: "Ask HN: What programming language made you most productive?",
    excerpt:
      "A community thread exploring the languages developers feel have most dramatically improved their productivity and code quality over the years, with surprising results.",
    date: new Date(2026, 3, 2),
    keywords: ["Open Source"],
    gradient: "from-violet-950 via-violet-900 to-slate-900",
  },
  {
    id: "7",
    feedId: "theverge",
    title: "DeepMind's AlphaFold 4 Now Predicts Protein–Drug Interactions",
    excerpt:
      "The latest version of the revolutionary protein structure prediction tool adds drug binding affinity predictions, potentially accelerating pharmaceutical development.",
    date: new Date(2026, 3, 2),
    keywords: ["AI"],
    gradient: "from-fuchsia-950 via-fuchsia-900 to-slate-900",
  },
  {
    id: "8",
    feedId: "arstechnica",
    title: "Why USB-C Cables Still Aren't Universal After All These Years",
    excerpt:
      "Despite years of the standard, the cable situation remains deeply confusing. A deep dive into the technical and market forces keeping the compatibility mess alive.",
    date: new Date(2026, 3, 1),
    keywords: [],
    gradient: "from-amber-950 via-amber-900 to-slate-900",
  },
]

// ── Style maps ─────────────────────────────────────────────────────────────────

const FEED_BADGE: Record<string, string> = {
  techcrunch: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  hackernews: "bg-orange-500/15 text-orange-400 border-orange-500/25",
  theverge: "bg-red-500/15 text-red-400 border-red-500/25",
  arstechnica: "bg-blue-500/15 text-blue-400 border-blue-500/25",
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

// ── Page ───────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const today = new Date(2026, 3, 7)
  const firstOfMonth = startOfMonth(today)

  const [dateFrom, setDateFrom] = useState<Date>(firstOfMonth)
  const [dateTo, setDateTo] = useState<Date>(today)
  const [selectedFeed, setSelectedFeed] = useState<string>("all")
  const [selectedKeyword, setSelectedKeyword] = useState<string>("all")

  const filtered = ARTICLES.filter((a) => {
    const inRange = isWithinInterval(a.date, { start: dateFrom, end: dateTo })
    const matchFeed = selectedFeed === "all" || a.feedId === selectedFeed
    const matchKeyword =
      selectedKeyword === "all" || a.keywords.includes(selectedKeyword)
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
              {FEEDS.map((f) => (
                <SelectItem key={f.id} value={f.id} className="font-mono text-xs">
                  {f.name}
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
              {KEYWORDS.map((k) => (
                <SelectItem key={k} value={k} className="font-mono text-xs">
                  {k}
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
            {filtered.map((article) => {
              const feed = FEEDS.find((f) => f.id === article.feedId)!
              return (
                <Card
                  key={article.id}
                  className="group border-white/8 hover:border-amber-500/35 transition-all duration-300 bg-white/4 hover:bg-white/6 gap-0 py-0"
                >
                  {/* Gradient image placeholder */}
                  <div
                    className={`h-36 bg-gradient-to-br ${article.gradient} relative overflow-hidden rounded-t-xl`}
                  >
                    {/* Subtle shimmer */}
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_70%_20%,rgba(255,255,255,0.06),transparent)]" />
                    {/* Noise texture overlay */}
                    <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay [background-image:url('data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%20200%20200%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cfilter%20id%3D%22n%22%3E%3CfeTurbulence%20type%3D%22fractalNoise%22%20baseFrequency%3D%220.9%22%20numOctaves%3D%224%22%2F%3E%3C%2Ffilter%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20filter%3D%22url(%23n)%22%2F%3E%3C%2Fsvg%3E')]" />
                    {/* Badges over image */}
                    <div className="absolute bottom-2.5 left-3 flex flex-wrap items-center gap-1.5">
                      <Badge
                        className={`text-[9px] font-mono border px-1.5 py-0.5 rounded ${FEED_BADGE[article.feedId]}`}
                      >
                        {feed.name}
                      </Badge>
                      {article.keywords.map((kw) => (
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
                      {article.title}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="px-4 pb-0">
                    <CardDescription className="line-clamp-3 text-[0.8rem] leading-relaxed">
                      {article.excerpt}
                    </CardDescription>
                  </CardContent>

                  <CardFooter className="px-4 pt-3 pb-3 flex items-center justify-between bg-transparent border-t-0">
                    <span className="font-mono text-[10px] text-muted-foreground tracking-wide">
                      {format(article.date, "do MMM yyyy")}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1.5 px-2 text-[11px] font-mono text-amber-400/80 hover:text-amber-300 hover:bg-amber-500/10"
                    >
                      Read Article
                      <ExternalLinkIcon className="size-3" />
                    </Button>
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
