"use client";

import { useState } from "react";
import { format, parseISO, subDays } from "date-fns";
import {
  TrendingUpIcon,
  TrendingDownIcon,
  MinusIcon,
  FlameIcon,
  BuildingIcon,
  UserIcon,
  MapPinIcon,
  TagIcon,
  PackageIcon,
  GlobeIcon,
  ArrowLeftIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import Link from "next/link";
import DashboardNav from "@/app/dashboard/_components/dashboard-nav";
import type { HotTopic, TrendPoint } from "@/data/entity-tags";

type Period = "today" | "week" | "month";

// ── Constants ──────────────────────────────────────────────────────────────────

const PERIOD_LABELS: Record<Period, string> = {
  today:  "Today",
  week:   "This Week",
  month:  "This Month",
};

const PERIOD_COMPARE_LABELS: Record<Period, string> = {
  today: "vs yesterday",
  week: "vs last week",
  month: "vs last month",
};

// Explains why the trend window is wider than the selected period
const TREND_CONTEXT_LABELS: Record<Period, string> = {
  today: "Past 7 days — see if today's spike is new or sustained",
  week:  "Past 30 days — compare this week against the prior 3 weeks",
  month: "Past 90 days — compare this month against the prior 2 months",
};

const CHART_COLORS = [
  "hsl(38, 92%, 50%)",   // amber
  "hsl(199, 89%, 48%)",  // sky
  "hsl(142, 71%, 45%)",  // green
  "hsl(271, 81%, 56%)",  // violet
  "hsl(350, 89%, 60%)",  // rose
];

const TOPIC_TYPE_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  ORG:     { label: "Org",      color: "bg-blue-500/15 text-blue-400 border-blue-500/25",     icon: <BuildingIcon className="size-2.5" /> },
  PERSON:  { label: "Person",   color: "bg-green-500/15 text-green-400 border-green-500/25",  icon: <UserIcon className="size-2.5" /> },
  GPE:     { label: "Place",    color: "bg-amber-500/15 text-amber-400 border-amber-500/25",  icon: <GlobeIcon className="size-2.5" /> },
  LOC:     { label: "Location", color: "bg-cyan-500/15 text-cyan-400 border-cyan-500/25",     icon: <MapPinIcon className="size-2.5" /> },
  PRODUCT: { label: "Product",  color: "bg-purple-500/15 text-purple-400 border-purple-500/25", icon: <PackageIcon className="size-2.5" /> },
  tags:    { label: "Tag",      color: "bg-slate-500/15 text-slate-400 border-slate-500/25",  icon: <TagIcon className="size-2.5" /> },
};

function getTopicMeta(type: string) {
  return TOPIC_TYPE_META[type] ?? TOPIC_TYPE_META["tags"];
}

// ── Period Tab ─────────────────────────────────────────────────────────────────

function PeriodTab({
  period,
  active,
  onClick,
}: {
  period: Period;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-1.5 text-[11px] font-mono tracking-widest uppercase rounded-md transition-all duration-200",
        active
          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
          : "text-muted-foreground border border-transparent hover:border-white/10 hover:text-foreground",
      )}
    >
      {PERIOD_LABELS[period]}
    </button>
  );
}

// ── Topic Row ──────────────────────────────────────────────────────────────────

function TopicRow({ topic, rank }: { topic: HotTopic; rank: number }) {
  const meta = getTopicMeta(topic.entityType);
  const hasChange = topic.changePercent !== null;
  const isUp = hasChange && topic.changePercent! > 0;
  const isDown = hasChange && topic.changePercent! < 0;

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0">
      {/* Rank */}
      <div className="w-6 text-right shrink-0">
        <span className="text-[11px] font-mono text-white/20 tabular-nums">{rank}</span>
      </div>

      {/* Topic name + type hint */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{topic.entityText}</span>
          <Badge
            variant="outline"
            className={cn("text-[9px] font-mono tracking-wide px-1 py-0 flex items-center gap-1 shrink-0", meta.color)}
          >
            {meta.icon}
            {meta.label}
          </Badge>
        </div>
      </div>

      {/* Change indicator */}
      <div className="shrink-0 text-right min-w-[60px]">
        {hasChange ? (
          <div
            className={cn(
              "flex items-center justify-end gap-0.5 text-[11px] font-mono",
              isUp ? "text-green-400" : isDown ? "text-red-400" : "text-white/30",
            )}
          >
            {isUp ? (
              <TrendingUpIcon className="size-3" />
            ) : isDown ? (
              <TrendingDownIcon className="size-3" />
            ) : (
              <MinusIcon className="size-3" />
            )}
            {isUp ? "+" : ""}
            {topic.changePercent}%
          </div>
        ) : (
          <span className="text-[11px] font-mono text-white/20">new</span>
        )}
      </div>

      {/* Count */}
      <div className="shrink-0 text-right min-w-[40px]">
        <span className="text-sm font-mono font-light text-amber-400 tabular-nums">
          {topic.currentCount}
        </span>
      </div>
    </div>
  );
}

// ── Trend Chart ────────────────────────────────────────────────────────────────

function buildChartData(
  trendData: TrendPoint[],
  topics: HotTopic[],
  days: number,
): { date: string; [key: string]: string | number }[] {
  const now = new Date();
  const dateMap = new Map<string, { date: string; [key: string]: string | number }>();

  for (let i = days - 1; i >= 0; i--) {
    const d = format(subDays(now, i), "yyyy-MM-dd");
    const entry: { date: string; [key: string]: string | number } = { date: d };
    for (const t of topics) entry[t.entityTextLower] = 0;
    dateMap.set(d, entry);
  }

  for (const point of trendData) {
    const entry = dateMap.get(point.date);
    if (entry) entry[point.entityTextLower] = point.count;
  }

  return Array.from(dateMap.values());
}

function TrendChart({
  trendData,
  topics,
  trendDays,
}: {
  trendData: TrendPoint[];
  topics: HotTopic[];
  trendDays: number;
}) {
  const chartData = buildChartData(trendData, topics, trendDays);

  const chartConfig = Object.fromEntries(
    topics.map((t, i) => [
      t.entityTextLower,
      { label: t.entityText, color: CHART_COLORS[i % CHART_COLORS.length] },
    ]),
  );

  // ~6 evenly spaced X ticks regardless of window size
  const xInterval = trendDays <= 7 ? 0 : trendDays <= 30 ? 4 : 13;

  const TICK_COLOR  = "rgba(255,255,255,0.55)";
  const AXIS_COLOR  = "rgba(255,255,255,0.12)";
  const GRID_COLOR  = "rgba(255,255,255,0.06)";
  const TICK_STYLE  = { fontSize: 11, fill: TICK_COLOR, fontFamily: "monospace" } as const;

  return (
    <ChartContainer config={chartConfig} className="h-[320px] w-full">
      <LineChart data={chartData} margin={{ top: 8, right: 16, left: 4, bottom: 8 }}>
        <CartesianGrid
          strokeDasharray="4 4"
          stroke={GRID_COLOR}
          horizontal={true}
          vertical={false}
        />
        <XAxis
          dataKey="date"
          axisLine={{ stroke: AXIS_COLOR }}
          tickLine={{ stroke: AXIS_COLOR }}
          tick={TICK_STYLE}
          tickMargin={8}
          interval={xInterval}
          tickFormatter={(v) => {
            try { return format(parseISO(v as string), "MMM d"); } catch { return v as string; }
          }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={TICK_STYLE}
          tickMargin={4}
          tickCount={5}
          allowDecimals={false}
          width={36}
          tickFormatter={(v: number) => (v === 0 ? "0" : v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))}
        />
        <ChartTooltip
          cursor={{ stroke: "rgba(255,255,255,0.12)", strokeWidth: 1 }}
          content={
            <ChartTooltipContent
              labelFormatter={(v) => {
                try { return format(parseISO(v as string), "do MMM yyyy"); } catch { return v as string; }
              }}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        {topics.map((t, i) => (
          <Line
            key={t.entityTextLower}
            type="monotone"
            dataKey={t.entityTextLower}
            name={t.entityText}
            stroke={CHART_COLORS[i % CHART_COLORS.length]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5, strokeWidth: 0 }}
          />
        ))}
      </LineChart>
    </ChartContainer>
  );
}

// ── Top 5 per Type breakdown ───────────────────────────────────────────────────

const TYPE_ORDER = ["ORG", "PERSON", "GPE", "PRODUCT", "LOC", "tags"];

function TopPerType({ topics }: { topics: HotTopic[] }) {
  const countMap = new Map(topics.map((t) => [t.entityTextLower, t.currentCount]));

  const byType = new Map<string, HotTopic[]>();
  for (const t of topics) {
    if (!byType.has(t.entityType)) byType.set(t.entityType, []);
    byType.get(t.entityType)!.push(t);
  }

  const orderedTypes = TYPE_ORDER.filter((tp) => byType.has(tp));

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {orderedTypes.map((type) => {
        const meta = getTopicMeta(type);
        const items = (byType.get(type) ?? []).slice(0, 5);
        return (
          <div key={type}>
            <Badge
              variant="outline"
              className={cn("text-[9px] font-mono px-1.5 py-0.5 flex items-center gap-1 w-fit mb-2", meta.color)}
            >
              {meta.icon}
              {meta.label}
            </Badge>
            <ol className="space-y-1">
              {items.map((t, i) => (
                <li key={t.entityTextLower} className="flex items-baseline gap-1.5">
                  <span className="text-[10px] font-mono text-white/20 tabular-nums w-3 shrink-0">{i + 1}</span>
                  <span className="text-[11px] font-mono text-white/70 truncate flex-1">{t.entityText}</span>
                  <span className="text-[10px] font-mono text-amber-400/70 tabular-nums shrink-0">
                    {countMap.get(t.entityTextLower) ?? t.currentCount}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function HotTopicsClient({
  todayTopics,
  weekTopics,
  monthTopics,
  todayTrend,
  weekTrend,
  monthTrend,
  trendDays,
  feedsCount,
  subscriptionsCount,
  keywordsCount,
  bookmarksCount,
}: {
  todayTopics: HotTopic[];
  weekTopics: HotTopic[];
  monthTopics: HotTopic[];
  todayTrend: TrendPoint[];
  weekTrend: TrendPoint[];
  monthTrend: TrendPoint[];
  trendDays: { today: number; week: number; month: number };
  feedsCount: number;
  subscriptionsCount: number;
  keywordsCount: number;
  bookmarksCount: number;
}) {
  const [period, setPeriod] = useState<Period>("today");

  const topicsMap: Record<Period, HotTopic[]> = {
    today: todayTopics,
    week: weekTopics,
    month: monthTopics,
  };

  const trendMap: Record<Period, TrendPoint[]> = {
    today: todayTrend,
    week: weekTrend,
    month: monthTrend,
  };

  const topics = topicsMap[period];
  const topTotal = topics[0]?.currentCount ?? 0;
  const chartTopics = topics.slice(0, 5);
  const chartTrend = trendMap[period];

  return (
    <div className="dark min-h-screen bg-[oklch(0.09_0_0)] text-foreground">

      {/* ── Header ── */}
      <div className="border-b border-white/8 px-6 py-7 lg:px-10">
        <div className="max-w-7xl mx-auto flex items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FlameIcon className="size-4 text-amber-400" />
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
              Hot Topics
            </h1>
            <p className="text-xs font-mono mt-2 tracking-wide text-muted-foreground">
              Trending topics &amp; keywords across your feeds
            </p>
          </div>

          <div className="flex items-end gap-6 shrink-0">
            <DashboardNav
              feedsCount={feedsCount}
              subscriptionsCount={subscriptionsCount}
              keywordsCount={keywordsCount}
              bookmarksCount={bookmarksCount}
              activePage="hot_topics"
            />

            <div className="text-right">
              <div className="text-[2.8rem] font-mono font-light text-amber-400 leading-none tabular-nums">
                {topTotal}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1 tracking-widest uppercase font-mono">
                top mentions
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="px-6 py-8 lg:px-10">
        <div className="max-w-7xl mx-auto space-y-8">

          {/* Period selector */}
          <div className="flex items-center gap-2">
            {(["today", "week", "month"] as Period[]).map((p) => (
              <PeriodTab key={p} period={p} active={period === p} onClick={() => setPeriod(p)} />
            ))}
          </div>

          {/* Summary sentence */}
          {topics.length > 0 && (
            <p className="text-sm text-muted-foreground font-mono">
              <span className="text-foreground font-medium">{topics[0].entityText}</span>
              {" was mentioned "}
              <span className="text-amber-400 font-medium">{topics[0].currentCount} times</span>
              {" "}
              <span className="text-white/40">{PERIOD_LABELS[period].toLowerCase()}</span>
              {topics[0].changePercent !== null && (
                <span
                  className={cn(
                    "ml-1",
                    topics[0].changePercent > 0
                      ? "text-green-400"
                      : topics[0].changePercent < 0
                        ? "text-red-400"
                        : "text-white/40",
                  )}
                >
                  ({topics[0].changePercent > 0 ? "+" : ""}{topics[0].changePercent}%{" "}
                  {PERIOD_COMPARE_LABELS[period]})
                </span>
              )}
            </p>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ── Top topics list ── */}
            <Card className="bg-white/3 border-white/8">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-mono tracking-widest uppercase text-amber-400 flex items-center gap-2">
                  <FlameIcon className="size-3.5" />
                  {PERIOD_LABELS[period]} — Top {Math.min(topics.length, 20)}
                </CardTitle>
                <p className="text-[10px] font-mono text-white/30 tracking-wide">
                  Ranked by article mentions · {PERIOD_COMPARE_LABELS[period]}
                </p>
              </CardHeader>
              <CardContent className="pt-0">
                {topics.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center font-mono">
                    No data for this period yet.
                  </p>
                ) : (
                  <div>
                    <div className="flex items-center gap-3 pb-2 border-b border-white/8 mb-1">
                      <div className="w-6" />
                      <div className="flex-1 text-[9px] font-mono text-white/30 tracking-widest uppercase">Topic</div>
                      <div className="shrink-0 text-right min-w-[60px] text-[9px] font-mono text-white/30 tracking-widest uppercase">Change</div>
                      <div className="shrink-0 text-right min-w-[40px] text-[9px] font-mono text-white/30 tracking-widest uppercase">Count</div>
                    </div>
                    {topics.slice(0, 20).map((topic, i) => (
                      <TopicRow key={topic.entityTextLower} topic={topic} rank={i + 1} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Trend chart ── */}
            <Card className="bg-white/3 border-white/8">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-mono tracking-widest uppercase text-amber-400 flex items-center gap-2">
                  <TrendingUpIcon className="size-3.5" />
                  {trendDays[period]}-Day Trend
                </CardTitle>
                <p className="text-[10px] font-mono text-white/30 tracking-wide">
                  {TREND_CONTEXT_LABELS[period]}
                </p>
              </CardHeader>
              <CardContent className="pt-0">
                {chartTopics.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center font-mono">
                    No trend data available yet.
                  </p>
                ) : (
                  <TrendChart
                    trendData={chartTrend}
                    topics={chartTopics}
                    trendDays={trendDays[period]}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Top 5 per type ── */}
          {topics.length > 0 && (
            <Card className="bg-white/3 border-white/8">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-mono tracking-widest uppercase text-amber-400">
                  Top Topics by Category — {PERIOD_LABELS[period]}
                </CardTitle>
                <p className="text-[10px] font-mono text-white/30 tracking-wide">
                  Top 5 topics per NER / keyword category
                </p>
              </CardHeader>
              <CardContent className="pt-0">
                <TopPerType topics={topics} />
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}
