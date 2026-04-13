"use client"

import Link from "next/link"
import {
  ActivityIcon,
  BookmarkCheckIcon,
  BookmarkIcon,
  BrainCircuitIcon,
  HeartPulseIcon,
  RssIcon,
  SettingsIcon,
  TagIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"

type ActivePage = "feeds" | "subscriptions" | "keywords" | "fetch" | "fetch_embedding" | "health" | "bookmarks"

type NavItem = {
  key: ActivePage
  label: string
  href: string
  icon: React.ReactNode
  value: React.ReactNode
}

export default function DashboardNav({
  feedsCount,
  subscriptionsCount,
  keywordsCount,
  bookmarksCount,
  activePage,
}: {
  feedsCount: number
  subscriptionsCount: number
  keywordsCount: number
  bookmarksCount?: number
  activePage?: ActivePage
}) {
  const items: NavItem[] = [
    {
      key: "feeds",
      label: "Feeds",
      href: "/dashboard/feeds",
      icon: <RssIcon className="size-3 text-amber-400" />,
      value: feedsCount,
    },
    {
      key: "subscriptions",
      label: "Subscriptions",
      href: "/dashboard/subscriptions",
      icon: <BookmarkIcon className="size-3 text-amber-400" />,
      value: subscriptionsCount,
    },
    {
      key: "keywords",
      label: "Keywords",
      href: "/dashboard/keywords",
      icon: <TagIcon className="size-3 text-amber-400" />,
      value: keywordsCount,
    },
    {
      key: "bookmarks",
      label: "Bookmarks",
      href: "/dashboard/bookmarks",
      icon: <BookmarkCheckIcon className="size-3 text-amber-400" />,
      value: bookmarksCount ?? "↗",
    },
    {
      key: "fetch",
      label: "Fetch Logs",
      href: "/dashboard/fetch",
      icon: <ActivityIcon className="size-3 text-amber-400" />,
      value: "↗",
    },
    {
      key: "fetch_embedding",
      label: "Embed Logs",
      href: "/dashboard/fetch_embedding",
      icon: <BrainCircuitIcon className="size-3 text-amber-400" />,
      value: "↗",
    },
    {
      key: "health",
      label: "AP Health",
      href: "/dashboard/health",
      icon: <HeartPulseIcon className="size-3 text-amber-400" />,
      value: "↗",
    },
  ]

  return (
    <div className="flex items-end gap-3">
      {items.map((item) => {
        const isActive = item.key === activePage
        const inner = (
          <>
            <div className="flex items-center gap-1.5">
              {item.icon}
              <span className="text-[10px] font-mono text-amber-400 tracking-widest uppercase">
                {item.label}
              </span>
              {!isActive && <SettingsIcon className="size-3 text-muted-foreground" />}
            </div>
            <div className="text-[1.6rem] font-mono font-light text-amber-400 leading-none tabular-nums self-end">
              {item.value}
            </div>
          </>
        )

        if (isActive) {
          return (
            <div
              key={item.key}
              className="h-auto flex flex-col items-end gap-1 px-3 py-2 rounded-lg border border-amber-500/30 bg-white/6 cursor-default"
            >
              {inner}
            </div>
          )
        }

        return (
          <Button
            key={item.key}
            asChild
            variant="ghost"
            className="h-auto flex-col items-end gap-1 px-3 py-2 rounded-lg border border-white/8 bg-white/4 hover:border-amber-500/35 hover:bg-white/6 transition-all duration-200"
          >
            <Link href={item.href}>{inner}</Link>
          </Button>
        )
      })}
    </div>
  )
}
