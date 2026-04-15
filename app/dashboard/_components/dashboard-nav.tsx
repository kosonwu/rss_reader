"use client"

import Link from "next/link"
import {
  ActivityIcon,
  ArrowUpRightIcon,
  BookmarkCheckIcon,
  BookmarkIcon,
  BrainCircuitIcon,
  ChevronDownIcon,
  HeartPulseIcon,
  MonitorIcon,
  RssIcon,
  ScanTextIcon,
  SettingsIcon,
  TagIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type ActivePage = "feeds" | "subscriptions" | "keywords" | "fetch" | "fetch_embedding" | "fetch_tag_extraction" | "fetch_ner" | "health" | "bookmarks"

type NavItem = {
  key: ActivePage
  label: string
  href: string
  icon: React.ReactNode
  value: React.ReactNode
}

const monitorPages: ActivePage[] = ["fetch", "fetch_embedding", "fetch_tag_extraction", "fetch_ner", "health"]

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
  ]

  const isMonitorActive = activePage !== undefined && monitorPages.includes(activePage)

  const monitorDropdown = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {isMonitorActive ? (
          <div className="h-auto flex flex-col items-end gap-1 px-3 py-2 rounded-lg border border-amber-500/30 bg-white/6 cursor-default">
            <div className="flex items-center gap-1.5">
              <MonitorIcon className="size-3 text-amber-400" />
              <span className="text-[10px] font-mono text-amber-400 tracking-widest uppercase">Monitor</span>
              <ChevronDownIcon className="size-3 text-muted-foreground" />
            </div>
            <div className="text-[1.6rem] font-mono font-light text-amber-400 leading-none tabular-nums self-end">
              ···
            </div>
          </div>
        ) : (
          <Button
            variant="ghost"
            className="h-auto flex-col items-end gap-1 px-3 py-2 rounded-lg border border-white/8 bg-white/4 hover:border-amber-500/35 hover:bg-white/6 transition-all duration-200"
          >
            <div className="flex items-center gap-1.5">
              <MonitorIcon className="size-3 text-amber-400" />
              <span className="text-[10px] font-mono text-amber-400 tracking-widest uppercase">Monitor</span>
              <ChevronDownIcon className="size-3 text-muted-foreground" />
            </div>
            <div className="text-[1.6rem] font-mono font-light text-amber-400 leading-none tabular-nums self-end">
              ···
            </div>
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-[oklch(0.12_0_0)] border border-white/8 min-w-[180px]">
        <DropdownMenuItem asChild>
          <Link href="/dashboard/fetch" className="flex items-center gap-2 font-mono text-[11px] tracking-widest uppercase text-amber-400 cursor-pointer">
            <ActivityIcon className="size-3.5" />
            Fetch Logs
            <ArrowUpRightIcon className="size-3 ml-auto text-muted-foreground" />
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard/fetch_embedding" className="flex items-center gap-2 font-mono text-[11px] tracking-widest uppercase text-amber-400 cursor-pointer">
            <BrainCircuitIcon className="size-3.5" />
            Embed Logs
            <ArrowUpRightIcon className="size-3 ml-auto text-muted-foreground" />
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard/fetch_tag_extraction" className="flex items-center gap-2 font-mono text-[11px] tracking-widest uppercase text-amber-400 cursor-pointer">
            <TagIcon className="size-3.5" />
            Tag Logs
            <ArrowUpRightIcon className="size-3 ml-auto text-muted-foreground" />
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard/fetch_ner" className="flex items-center gap-2 font-mono text-[11px] tracking-widest uppercase text-amber-400 cursor-pointer">
            <ScanTextIcon className="size-3.5" />
            NER Logs
            <ArrowUpRightIcon className="size-3 ml-auto text-muted-foreground" />
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard/health" className="flex items-center gap-2 font-mono text-[11px] tracking-widest uppercase text-amber-400 cursor-pointer">
            <HeartPulseIcon className="size-3.5" />
            AP Health
            <ArrowUpRightIcon className="size-3 ml-auto text-muted-foreground" />
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

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
      {monitorDropdown}
    </div>
  )
}
