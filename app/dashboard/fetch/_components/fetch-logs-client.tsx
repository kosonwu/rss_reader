"use client";

import { useState } from "react";
import Link from "next/link";
import { format, parseISO, startOfMonth, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import {
  ActivityIcon,
  ArrowLeftIcon,
  CalendarIcon,
  CheckCircle2Icon,
  XCircleIcon,
  MinusCircleIcon,
  ClockIcon,
  FilterIcon,
  RssIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import DashboardNav from "@/app/dashboard/_components/dashboard-nav";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type FetchLog = {
  id: string;
  feedId: string;
  feedTitle: string | null;
  feedUrl: string;
  status: "success" | "failed" | "skipped";
  articleCount: number;
  durationMs: number | null;
  errorMessage: string | null;
  runAt: string;
};

// ── Status badge ───────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: FetchLog["status"] }) {
  if (status === "success") {
    return (
      <Badge className="gap-1 text-[10px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 px-1.5 py-0.5 rounded">
        <CheckCircle2Icon className="size-3" />
        success
      </Badge>
    );
  }
  if (status === "failed") {
    return (
      <Badge className="gap-1 text-[10px] font-mono bg-red-500/15 text-red-400 border border-red-500/25 px-1.5 py-0.5 rounded">
        <XCircleIcon className="size-3" />
        failed
      </Badge>
    );
  }
  return (
    <Badge className="gap-1 text-[10px] font-mono bg-amber-500/15 text-amber-400 border border-amber-500/25 px-1.5 py-0.5 rounded">
      <MinusCircleIcon className="size-3" />
      skipped
    </Badge>
  );
}

// ── Duration formatter ─────────────────────────────────────────────────────────

function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// ── DatePicker sub-component ───────────────────────────────────────────────────

function DatePicker({
  date,
  onSelect,
  label,
}: {
  date: Date;
  onSelect: (d: Date) => void;
  label: string;
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
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function FetchLogsClient({
  logs,
  feedsCount,
  subscriptionsCount,
  keywordsCount,
}: {
  logs: FetchLog[];
  feedsCount: number;
  subscriptionsCount: number;
  keywordsCount: number;
}) {
  const today = new Date();
  const firstOfMonth = startOfMonth(today);

  const [dateFrom, setDateFrom] = useState<Date>(today);
  const [dateTo, setDateTo] = useState<Date>(today);
  const [feedFilter, setFeedFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const uniqueFeeds = Array.from(
    new Map(logs.map((l) => [l.feedId, { id: l.feedId, title: l.feedTitle ?? l.feedUrl }])).values()
  ).sort((a, b) => a.title.localeCompare(b.title));

  const filtered = logs.filter((log) => {
    const runAt = parseISO(log.runAt);
    if (!isWithinInterval(runAt, { start: startOfDay(dateFrom), end: endOfDay(dateTo) })) return false;
    if (feedFilter !== "all" && log.feedId !== feedFilter) return false;
    if (statusFilter !== "all" && log.status !== statusFilter) return false;
    return true;
  });

  const successCount = filtered.filter((l) => l.status === "success").length;
  const failedCount = filtered.filter((l) => l.status === "failed").length;

  return (
    <div className="dark min-h-screen bg-[oklch(0.09_0_0)] text-foreground">
      {/* ── Header ── */}
      <div className="border-b border-white/8 px-6 py-7 lg:px-10">
        <div className="max-w-7xl mx-auto flex items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ActivityIcon className="size-4 text-amber-400" />
              <span className="text-[10px] font-mono text-amber-400 tracking-[0.25em] uppercase">
                RSS Reader
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
              Fetch Logs
            </h1>
            <p className="text-xs font-mono text-muted-foreground mt-2 tracking-wide">
              {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
            </p>
          </div>

          {/* Nav + Summary stats */}
          <div className="flex items-end gap-6 shrink-0">
            <DashboardNav
              feedsCount={feedsCount}
              subscriptionsCount={subscriptionsCount}
              keywordsCount={keywordsCount}
              activePage="fetch"
            />
            <div className="text-right">
              <div className="text-[1.8rem] font-mono font-light text-emerald-400 leading-none tabular-nums">
                {successCount}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1 tracking-widest uppercase font-mono">
                success
              </div>
            </div>
            <div className="text-right">
              <div className="text-[1.8rem] font-mono font-light text-red-400 leading-none tabular-nums">
                {failedCount}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1 tracking-widest uppercase font-mono">
                failed
              </div>
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
          <Select value={feedFilter} onValueChange={setFeedFilter}>
            <SelectTrigger className="h-9 min-w-[180px] font-mono text-xs border-white/15 bg-white/5 hover:bg-white/10 focus:ring-0 focus:ring-offset-0">
              <SelectValue placeholder="All feeds" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="font-mono text-xs">All feeds</SelectItem>
              {uniqueFeeds.map((feed) => (
                <SelectItem key={feed.id} value={feed.id} className="font-mono text-xs">
                  {feed.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 min-w-[140px] font-mono text-xs border-white/15 bg-white/5 hover:bg-white/10 focus:ring-0 focus:ring-offset-0">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="font-mono text-xs">All statuses</SelectItem>
              <SelectItem value="success" className="font-mono text-xs">Success</SelectItem>
              <SelectItem value="failed" className="font-mono text-xs">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="max-w-7xl mx-auto px-6 py-8 lg:px-10">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-muted-foreground gap-4">
            <ActivityIcon className="size-14 opacity-10" />
            <p className="font-mono text-sm">No fetch logs in this date range.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-white/8 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-white/8 hover:bg-transparent">
                  <TableHead className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground w-[220px]">
                    Feed
                  </TableHead>
                  <TableHead className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground w-[110px]">
                    Status
                  </TableHead>
                  <TableHead className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground w-[100px] text-right">
                    Articles
                  </TableHead>
                  <TableHead className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground w-[100px] text-right">
                    Duration
                  </TableHead>
                  <TableHead className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground">
                    Error
                  </TableHead>
                  <TableHead className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground w-[150px] text-right">
                    Run at
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((log) => (
                  <TableRow
                    key={log.id}
                    className="border-white/8 hover:bg-white/4 transition-colors duration-150"
                  >
                    {/* Feed name */}
                    <TableCell className="py-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <RssIcon className="size-3 text-amber-400 shrink-0" />
                        <span className="font-mono text-xs text-foreground truncate">
                          {log.feedTitle ?? log.feedUrl}
                        </span>
                      </div>
                    </TableCell>

                    {/* Status */}
                    <TableCell className="py-3">
                      <StatusBadge status={log.status} />
                    </TableCell>

                    {/* Article count */}
                    <TableCell className="py-3 text-right">
                      <span className="font-mono text-xs tabular-nums text-foreground">
                        {log.articleCount}
                      </span>
                    </TableCell>

                    {/* Duration */}
                    <TableCell className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <ClockIcon className="size-3 text-muted-foreground shrink-0" />
                        <span className="font-mono text-xs tabular-nums text-muted-foreground">
                          {formatDuration(log.durationMs)}
                        </span>
                      </div>
                    </TableCell>

                    {/* Error message */}
                    <TableCell className="py-3 max-w-[260px]">
                      {log.errorMessage ? (
                        <span className="font-mono text-[11px] text-red-400 truncate block">
                          {log.errorMessage}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>

                    {/* Run at */}
                    <TableCell className="py-3 text-right">
                      <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                        {format(parseISO(log.runAt), "do MMM yyyy, HH:mm")}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
