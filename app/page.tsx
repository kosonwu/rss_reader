import React from "react"
import Link from "next/link"
import Image from "next/image"
import {
  FlaskConicalIcon,
  TagIcon,
  ActivityIcon,
  HeartPulseIcon,
  BookmarkIcon,
  ArrowRightIcon,
  SearchIcon,
  HashIcon,
  ScanTextIcon,
  FlameIcon,
} from "lucide-react"
import { Show } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { SignInModalButton } from "./_components/sign-in-modal-button"

const features: { icon: React.ElementType; label: string; title: string; description: string; wide?: boolean }[] = [
  {
    icon: SearchIcon,
    label: "Semantic Search",
    title: "Search by meaning",
    description:
      "Find articles by concept, not just keywords. Describe an idea or ask a question — Distill matches it against stored article embeddings to surface what's relevant.",
    wide: true,
  },
  {
    icon: FlameIcon,
    label: "Hot Topics",
    title: "See what's trending",
    description:
      "Ranked topic leaderboard for today, this week, and this month. Spot rising entities, track momentum vs the prior period, and follow trend lines at a glance.",
  },
  {
    icon: TagIcon,
    label: "Keywords",
    title: "Surface what you care about",
    description:
      "Define keywords to filter articles that matter to you. Matches across title, description, and full content — case-sensitive or not. Save any tag as a keyword in one click.",
  },
  {
    icon: HashIcon,
    label: "Auto Tags",
    title: "AI topic tags",
    description:
      "Every article is automatically tagged with up to 8 topic keywords using AI. Browse by topic, scan at a glance, or promote any tag into a keyword filter in one click.",
  },
  {
    icon: ScanTextIcon,
    label: "NER",
    title: "Entity intelligence",
    description:
      "Every article is scanned for named entities — people, organisations, places, and products. Powered by CKIP (zh-TW) and spaCy (en), normalised to a unified namespace.",
  },
  {
    icon: BookmarkIcon,
    label: "Bookmarks",
    title: "Save articles for later",
    description:
      "Bookmark any article to revisit whenever you want. Use tag chips to bulk-bookmark everything sharing a topic at once — no need to save them one by one.",
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

          {/* Logo */}
          <div className="mb-10 flex items-center gap-4">
            <div className="relative rounded-2xl bg-amber-500/8 border border-amber-500/20 p-2.5 shadow-[0_0_32px_rgba(245,158,11,0.12)]">
              <Image
                src="/logo.svg"
                alt="Distill logo"
                width={72}
                height={72}
                priority
                className="block"
              />
            </div>
            <div>
              <div className="text-[11px] font-mono text-amber-400/60 tracking-[0.3em] uppercase mb-1">
                By Koson
              </div>
              <div className="font-[family-name:var(--font-playfair)] text-2xl font-bold tracking-tight text-foreground leading-none">
                Distill
              </div>
            </div>
          </div>

          {/* Headline */}
          <h1 className="font-[family-name:var(--font-playfair)] text-[3.8rem] md:text-[5rem] font-bold tracking-tight leading-[1.05] text-foreground mb-6">
            Follow what
            <br />
            <span className="text-amber-400">actually matters.</span>
          </h1>

          {/* Tagline */}
          <p className="font-mono text-[1.15rem] font-semibold text-amber-400 tracking-wide mb-5">
            Read less. Know more.
          </p>

          {/* Subheadline */}
          <p className="max-w-lg text-[0.95rem] leading-relaxed text-muted-foreground font-mono mb-10">
            Connect your feeds. Distill's AI pipeline tags every article, extracts named entities,
            tracks trending topics, and powers semantic search — so you read signal, not noise.
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

      {/* ── Stats strip ── */}
      <div className="max-w-4xl mx-auto px-6 py-8 lg:px-10">
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
          {["Semantic search", "AI auto-tagging", "Entity extraction", "Trending topics"].map((item, i, arr) => (
            <React.Fragment key={item}>
              <span className="text-[11px] font-mono text-muted-foreground tracking-widest uppercase">
                {item}
              </span>
              {i < arr.length - 1 && (
                <span className="text-white/15 text-xs select-none">·</span>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ── Features ── */}
      <div className="max-w-4xl mx-auto px-6 pb-20 lg:px-10">
        <div className="mb-10">
          <span className="text-[10px] font-mono text-amber-400 tracking-[0.28em] uppercase">
            Everything included.
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map(({ icon: Icon, label, title, description, wide }) => (
            <div
              key={label}
              className={[
                "rounded-xl border border-white/8 bg-white/4 px-5 py-5 hover:border-amber-500/25 hover:bg-white/6 transition-all duration-200",
                wide ? "lg:col-span-2" : "",
              ].join(" ")}
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
            <FlaskConicalIcon className="size-3.5 text-amber-400" />
            <span className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">
              Distill
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
