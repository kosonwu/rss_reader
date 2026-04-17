import Link from "next/link"
import {
  RssIcon,
  TagIcon,
  ActivityIcon,
  HeartPulseIcon,
  BookmarkIcon,
  ArrowRightIcon,
  ZapIcon,
  RadioIcon,
  SearchIcon,
  HashIcon,
  ScanTextIcon,
  FlameIcon,
} from "lucide-react"
import { Show } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { SignInModalButton } from "./_components/sign-in-modal-button"

const features = [
  {
    icon: RadioIcon,
    label: "Subscriptions",
    title: "Subscribe to any feed",
    description:
      "Add any RSS or Atom URL and subscribe. Manage display names and toggle sources on or off at any time.",
  },
  {
    icon: TagIcon,
    label: "Keywords",
    title: "Filter by keyword",
    description:
      "Define keywords to surface the articles that matter. Matches across title, description, and full content — case-sensitive or not. Save any tag as a keyword in one click from the dashboard.",
  },
  {
    icon: BookmarkIcon,
    label: "Bookmarks",
    title: "Save articles for later",
    description:
      "Bookmark any article to revisit it whenever you want. Use the tag chip to bulk-bookmark all articles sharing a tag at once — no need to save them one by one.",
  },
  {
    icon: SearchIcon,
    label: "Semantic Search",
    title: "Search by meaning",
    description:
      "Find articles by concept, not just exact words. Queries are embedded and matched against stored article vectors using cosine similarity.",
  },
  {
    icon: HashIcon,
    label: "Auto Tags",
    title: "KeyBERT topic tags",
    description:
      "Every article is automatically tagged with 5–8 topic keywords extracted by KeyBERT. Browse by topic or scan tags at a glance.",
  },
  {
    icon: ScanTextIcon,
    label: "NER",
    title: "Named entity recognition",
    description:
      "Every article is analysed for named entities — organisations, people, places, and products — using CKIP (zh-TW) and spaCy (en), normalised to a unified OntoNotes namespace.",
  },
  {
    icon: FlameIcon,
    label: "Hot Topics",
    title: "See what's trending",
    description:
      "Ranked topic leaderboard for today, this week, and this month. Spot rising entities, track % change vs the prior period, and follow 30-day trend lines at a glance.",
  },
  {
    icon: ActivityIcon,
    label: "Fetch Logs",
    title: "Full fetch history",
    description:
      "Every fetch run is logged with status, duration, and article count. Know exactly what was fetched, when, and why it failed.",
  },
  {
    icon: HeartPulseIcon,
    label: "Health Monitor",
    title: "Live fetcher status",
    description:
      "Real-time view of the background fetcher service, polled every 5 seconds. Spot downtime before it becomes a problem.",
  },
]

export default function HomePage() {
  return (
    <div className="dark min-h-screen bg-[oklch(0.09_0_0)] text-foreground">

      {/* ── Hero ── */}
      <div className="relative px-6 pt-32 pb-24 lg:px-10 overflow-hidden">
        {/* Subtle radial glow */}
        <div className="pointer-events-none absolute inset-0 flex items-start justify-center">
          <div className="mt-12 h-[420px] w-[700px] rounded-full bg-amber-500/6 blur-[120px]" />
        </div>

        <div className="relative max-w-4xl mx-auto">
          {/* Brand label */}
          <div className="flex items-center gap-2 mb-10">
            <RssIcon className="size-4 text-amber-400" />
            <span className="text-[10px] font-mono text-amber-400 tracking-[0.28em] uppercase">
              RSS Reader
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-[family-name:var(--font-playfair)] text-[3.8rem] md:text-[5rem] font-bold tracking-tight leading-[1.05] text-foreground mb-6">
            Follow what
            <br />
            <span className="text-amber-400">actually matters.</span>
          </h1>

          {/* Subheadline */}
          <p className="max-w-xl text-[1rem] leading-relaxed text-muted-foreground font-mono mb-10">
            A focused RSS reader with keyword filtering, semantic search, auto-tagging, named entity
            recognition, trending topic analytics, and full observability into every fetch run.
          </p>

          {/* CTA */}
          <Show when="signed-in">
            <Button
              asChild
              className="gap-2.5 h-11 px-6 bg-amber-500 text-black hover:bg-amber-400 font-mono text-xs tracking-widest uppercase font-semibold rounded-lg"
            >
              <Link href="/dashboard">
                Open Dashboard
                <ArrowRightIcon className="size-3.5" />
              </Link>
            </Button>
          </Show>
          <Show when="signed-out">
            <SignInModalButton />
          </Show>
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="max-w-4xl mx-auto px-6 lg:px-10">
        <div className="border-t border-white/8" />
      </div>

      {/* ── Features ── */}
      <div className="max-w-4xl mx-auto px-6 py-20 lg:px-10">
        <div className="flex items-center gap-2 mb-10">
          <ZapIcon className="size-3.5 text-amber-400" />
          <span className="text-[10px] font-mono text-amber-400 tracking-[0.28em] uppercase">
            What's included
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map(({ icon: Icon, label, title, description }) => (
            <div
              key={label}
              className="rounded-xl border border-white/8 bg-white/4 px-5 py-5 hover:border-amber-500/25 hover:bg-white/6 transition-all duration-200"
            >
              <div className="flex items-center gap-2 mb-3">
                <Icon className="size-3.5 text-amber-400 shrink-0" />
                <span className="text-[10px] font-mono text-amber-400 tracking-[0.2em] uppercase">
                  {label}
                </span>
              </div>
              <h2 className="font-[family-name:var(--font-playfair)] text-[1.1rem] font-semibold leading-snug mb-2">
                {title}
              </h2>
              <p className="text-[0.8rem] leading-relaxed text-muted-foreground">
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="max-w-4xl mx-auto px-6 pb-10 lg:px-10">
        <div className="border-t border-white/8 pt-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RssIcon className="size-3.5 text-amber-400" />
            <span className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">
              RSS Reader
            </span>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground tracking-wide">
            Next.js · Python · Neon
          </span>
        </div>
      </div>

    </div>
  )
}
