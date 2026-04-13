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
      "Define keywords to surface the articles that matter. Each keyword highlights matching titles and descriptions — case-sensitive or not.",
  },
  {
    icon: BookmarkIcon,
    label: "Bookmarks",
    title: "Save articles for later",
    description:
      "Bookmark any article to revisit it whenever you want. Your saved articles are always one click away in the dashboard.",
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
            A focused RSS reader with per-user keyword filtering, automated background fetching,
            and full observability into every fetch run.
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
