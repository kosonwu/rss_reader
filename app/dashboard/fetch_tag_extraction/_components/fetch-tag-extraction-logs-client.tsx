"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format, parseISO, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import {
  TagIcon,
  ArrowLeftIcon,
  CalendarIcon,
  CheckCircle2Icon,
  XCircleIcon,
  MinusCircleIcon,
  ClockIcon,
  FilterIcon,
  CpuIcon,
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

type TagExtractionLog = {
  id: string;
  status: "success" | "failed" | "skipped";
  itemsFetched: number;
  itemsTagged: number;
  itemsSkipped: number;
  itemsRemainingAfter: number | null;
  durationMs: number | null;
  modelName: string | null;
  errorMessage: string | null;
  runAt: string;
};

// ── Status badge ───────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: TagExtractionLog["status"] }) {
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
      <PopoverContent className="dark w-auto p-0 bg-[oklch(0.13_0_0)] border-white/15 shadow-xl shadow-black/50" align="start">
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

const PAGE_SIZE = 20;

// ── Main component ─────────────────────────────────────────────────────────────

export default function FetchTagExtractionLogsClient({
  logs,
  feedsCount,
  subscriptionsCount,
  keywordsCount,
  bookmarksCount,
}: {
  logs: TagExtractionLog[];
  feedsCount: number;
  subscriptionsCount: number;
  keywordsCount: number;
  bookmarksCount: number;
}) {
  const router = useRouter();

  useEffect(() => {
    const POLL_INTERVAL = 60_000 // 60 seconds
    const id = setInterval(() => router.refresh(), POLL_INTERVAL)
    return () => clearInterval(id)
  }, [router])

  const today = new Date();

  const [dateFrom, setDateFrom] = useState<Date>(today);
  const [dateTo, setDateTo] = useState<Date>(today);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  function handleDateFrom(d: Date) { setDateFrom(d); setPage(1); }
  function handleDateTo(d: Date) { setDateTo(d); setPage(1); }
  function handleStatusFilter(v: string) { setStatusFilter(v); setPage(1); }

  const filtered = logs.filter((log) => {
    const runAt = parseISO(log.runAt);
    if (!isWithinInterval(runAt, { start: startOfDay(dateFrom), end: endOfDay(dateTo) })) return false;
    if (statusFilter !== "all" && log.status !== statusFilter) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pagedLogs = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const successCount = filtered.filter((l) => l.status === "success").length;
  const failedCount = filtered.filter((l) => l.status === "failed").length;

  return (
    <div className="dark min-h-screen bg-[oklch(0.09_0_0)] text-foreground">
      {/* ── Header ── */}
      <div className="border-b border-white/8 px-6 py-7 lg:px-10">
        <div className="max-w-7xl mx-auto flex items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TagIcon className="size-4 text-amber-400" />
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
              Tag Extraction Logs
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
              bookmarksCount={bookmarksCount}
              activePage="fetch_tag_extraction"
            />
            <div className="text-right">
              <div className="text-[16px] font-mono font-light text-emerald-400 leading-none tabular-nums">
                {successCount}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1 tracking-widest uppercase font-mono">
                success
              </div>
            </div>
            <div className="text-right">
              <div className="text-[16px] font-mono font-light text-red-400 leading-none tabular-nums">
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
          <DatePicker date={dateFrom} onSelect={handleDateFrom} label="From" />
          <DatePicker date={dateTo} onSelect={handleDateTo} label="To" />
          <Select value={statusFilter} onValueChange={handleStatusFilter}>
            <SelectTrigger className="h-9 min-w-[140px] font-mono text-xs border-white/15 bg-white/5 hover:bg-white/10 focus:ring-0 focus:ring-offset-0">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent className="dark bg-[oklch(0.13_0_0)] border-white/15 shadow-xl shadow-black/50">
              <SelectItem value="all" className="font-mono text-xs text-foreground focus:bg-white/8 focus:text-foreground">All statuses</SelectItem>
              <SelectItem value="success" className="font-mono text-xs text-foreground focus:bg-white/8 focus:text-foreground">Success</SelectItem>
              <SelectItem value="failed" className="font-mono text-xs text-foreground focus:bg-white/8 focus:text-foreground">Failed</SelectItem>
              <SelectItem value="skipped" className="font-mono text-xs text-foreground focus:bg-white/8 focus:text-foreground">Skipped</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="max-w-7xl mx-auto px-6 py-8 lg:px-10">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-muted-foreground gap-4">
            <TagIcon className="size-14 opacity-10" />
            <p className="font-mono text-sm">No tag extraction logs in this date range.</p>
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-white/8 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/8 hover:bg-transparent">
                    <TableHead className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground w-[110px]">
                      Status
                    </TableHead>
                    <TableHead className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground w-[90px] text-right">
                      Fetched
                    </TableHead>
                    <TableHead className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground w-[90px] text-right">
                      Tagged
                    </TableHead>
                    <TableHead className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground w-[90px] text-right">
                      Skipped
                    </TableHead>
                    <TableHead className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground w-[100px] text-right">
                      Remaining
                    </TableHead>
                    <TableHead className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground w-[100px] text-right">
                      Duration
                    </TableHead>
                    <TableHead className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground">
                      Model
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
                  {pagedLogs.map((log) => (
                    <TableRow
                      key={log.id}
                      className="border-white/8 hover:bg-white/4 transition-colors duration-150"
                    >
                      {/* Status */}
                      <TableCell className="py-3">
                        <StatusBadge status={log.status} />
                      </TableCell>

                      {/* Items fetched */}
                      <TableCell className="py-3 text-right">
                        <span className="font-mono text-xs tabular-nums text-foreground">
                          {log.itemsFetched}
                        </span>
                      </TableCell>

                      {/* Items tagged */}
                      <TableCell className="py-3 text-right">
                        <span className="font-mono text-xs tabular-nums text-violet-400">
                          {log.itemsTagged}
                        </span>
                      </TableCell>

                      {/* Items skipped */}
                      <TableCell className="py-3 text-right">
                        <span className="font-mono text-xs tabular-nums text-muted-foreground">
                          {log.itemsSkipped}
                        </span>
                      </TableCell>

                      {/* Items remaining after */}
                      <TableCell className="py-3 text-right">
                        <span className="font-mono text-xs tabular-nums text-muted-foreground">
                          {log.itemsRemainingAfter ?? "—"}
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

                      {/* Model name */}
                      <TableCell className="py-3 max-w-[180px]">
                        {log.modelName ? (
                          <div className="flex items-center gap-1.5 min-w-0">
                            <CpuIcon className="size-3 text-amber-400 shrink-0" />
                            <span className="font-mono text-[11px] text-muted-foreground truncate">
                              {log.modelName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>

                      {/* Error message */}
                      <TableCell className="py-3 max-w-[220px]">
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

            {totalPages > 1 && (
              <div className="mt-4">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => { e.preventDefault(); setPage((p) => Math.max(1, p - 1)); }}
                        aria-disabled={page === 1}
                        className={page === 1 ? "pointer-events-none opacity-40" : ""}
                      />
                    </PaginationItem>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <PaginationItem key={p}>
                        <PaginationLink
                          href="#"
                          onClick={(e) => { e.preventDefault(); setPage(p); }}
                          isActive={p === page}
                        >
                          {p}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => { e.preventDefault(); setPage((p) => Math.min(totalPages, p + 1)); }}
                        aria-disabled={page === totalPages}
                        className={page === totalPages ? "pointer-events-none opacity-40" : ""}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
