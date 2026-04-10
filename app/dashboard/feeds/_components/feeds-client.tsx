"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  PlusIcon,
  Trash2Icon,
  RssIcon,
  PencilIcon,
  ArrowLeftIcon,
  ExternalLinkIcon,
  SearchIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import DashboardNav from "@/app/dashboard/_components/dashboard-nav";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { addFeedAction, removeFeedAction, updateFeedAction } from "../actions";

type FetchStatus = "pending" | "active" | "error" | "paused";

type Feed = {
  id: string;
  title: string | null;
  description: string | null;
  url: string;
  siteUrl: string | null;
  fetchStatus: FetchStatus;
  fetchIntervalMinutes: number;
  lastFetchedAt: string | null;
  lastFetchError: string | null;
  createdAt: string;
};

const statusConfig: Record<FetchStatus, { label: string; className: string }> = {
  active: {
    label: "Active",
    className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  },
  pending: {
    label: "Pending",
    className: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25",
  },
  error: {
    label: "Error",
    className: "bg-red-500/15 text-red-400 border-red-500/25",
  },
  paused: {
    label: "Paused",
    className: "bg-zinc-500/15 text-zinc-400 border-zinc-500/25",
  },
};

const FETCH_STATUS_OPTIONS: { value: FetchStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "error", label: "Error" },
  { value: "paused", label: "Paused" },
];

// ── Shared field styles ───────────────────────────────────────────────────────

const inputCls = "border-white/15 bg-white/5 focus-visible:ring-amber-500/50 text-foreground placeholder:text-muted-foreground/50";
const labelCls = "text-sm text-foreground/80";

// ── Feed form fields (shared between Add and Edit) ────────────────────────────

type FeedFormState = {
  title: string;
  description: string;
  siteUrl: string;
  fetchStatus: FetchStatus;
  fetchIntervalMinutes: string;
};

function FeedFormFields({
  state,
  onChange,
}: {
  state: FeedFormState;
  onChange: (patch: Partial<FeedFormState>) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="ff-title" className={labelCls}>Title</Label>
        <Input
          id="ff-title"
          value={state.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="My feed"
          className={inputCls}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ff-description" className={labelCls}>Description</Label>
        <Input
          id="ff-description"
          value={state.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Brief description"
          className={inputCls}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ff-site-url" className={labelCls}>Site URL</Label>
        <Input
          id="ff-site-url"
          type="url"
          value={state.siteUrl}
          onChange={(e) => onChange({ siteUrl: e.target.value })}
          placeholder="https://example.com"
          className={inputCls}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="ff-status" className={labelCls}>Fetch status</Label>
          <Select
            value={state.fetchStatus}
            onValueChange={(v) => onChange({ fetchStatus: v as FetchStatus })}
          >
            <SelectTrigger
              id="ff-status"
              className={`w-full ${inputCls}`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="dark bg-[oklch(0.13_0_0)] border-white/10 text-foreground">
              {FETCH_STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="font-mono text-sm focus:bg-white/8 focus:text-foreground">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ff-interval" className={labelCls}>
            Fetch interval <span className="text-muted-foreground">(min)</span>
          </Label>
          <Input
            id="ff-interval"
            type="number"
            min={1}
            max={10080}
            value={state.fetchIntervalMinutes}
            onChange={(e) => onChange({ fetchIntervalMinutes: e.target.value })}
            className={inputCls}
          />
        </div>
      </div>

    </div>
  );
}

// ── Add Dialog ───────────────────────────────────────────────────────────────

function AddDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [url, setUrl] = useState("");
  const [fields, setFields] = useState<FeedFormState>({
    title: "",
    description: "",
    siteUrl: "",
    fetchStatus: "pending",
    fetchIntervalMinutes: "60",
  });
  const [isPending, startTransition] = useTransition();

  function patch(p: Partial<FeedFormState>) {
    setFields((prev) => ({ ...prev, ...p }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await addFeedAction({
        url,
        title: fields.title.trim() || null,
        description: fields.description.trim() || null,
        siteUrl: fields.siteUrl.trim() || null,
        fetchStatus: fields.fetchStatus,
        fetchIntervalMinutes: parseInt(fields.fetchIntervalMinutes, 10) || 60,
      });
      if (result?.error) {
        toast.error(result.error);
      } else {
        setUrl("");
        setFields({
          title: "",
          description: "",
          siteUrl: "",
          fetchStatus: "pending",
          fetchIntervalMinutes: "60",
        });
        onOpenChange(false);
        toast.success("Feed added");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dark bg-[oklch(0.13_0_0)] border-white/10 text-foreground sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-[family-name:var(--font-playfair)]">
            Add feed
          </DialogTitle>
          <DialogDescription className="sr-only">Add a new RSS feed</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-2">
            <Label htmlFor="add-feed-url" className={labelCls}>
              Feed URL <span className="text-amber-400">*</span>
            </Label>
            <Input
              id="add-feed-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/rss"
              required
              className={inputCls}
            />
          </div>

          <div className="border-t border-white/8 pt-4">
            <p className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase mb-3">
              Optional metadata
            </p>
            <FeedFormFields state={fields} onChange={patch} />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                className="border-white/15 bg-white/5 hover:bg-white/10"
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-amber-500 text-black hover:bg-amber-400"
            >
              {isPending ? "Adding…" : "Add feed"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit Dialog ──────────────────────────────────────────────────────────────

function EditDialog({
  feed,
  open,
  onOpenChange,
}: {
  feed: Feed;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [fields, setFields] = useState<FeedFormState>({
    title: feed.title ?? "",
    description: feed.description ?? "",
    siteUrl: feed.siteUrl ?? "",
    fetchStatus: feed.fetchStatus,
    fetchIntervalMinutes: String(feed.fetchIntervalMinutes),
  });
  const [isPending, startTransition] = useTransition();

  function patch(p: Partial<FeedFormState>) {
    setFields((prev) => ({ ...prev, ...p }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateFeedAction({
        feedId: feed.id,
        title: fields.title.trim() || null,
        description: fields.description.trim() || null,
        siteUrl: fields.siteUrl.trim() || null,
        fetchStatus: fields.fetchStatus,
        fetchIntervalMinutes: parseInt(fields.fetchIntervalMinutes, 10) || 60,
      });
      if (result?.error) {
        toast.error(result.error);
      } else {
        onOpenChange(false);
        toast.success("Feed updated");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dark bg-[oklch(0.13_0_0)] border-white/10 text-foreground sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-[family-name:var(--font-playfair)]">
            Edit feed
          </DialogTitle>
          <DialogDescription className="sr-only">Edit feed metadata</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-2">
            <Label className={labelCls}>Feed URL</Label>
            <p className="text-sm font-mono text-muted-foreground truncate">{feed.url}</p>
          </div>

          <div className="border-t border-white/8 pt-4">
            <FeedFormFields state={fields} onChange={patch} />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                className="border-white/15 bg-white/5 hover:bg-white/10"
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-amber-500 text-black hover:bg-amber-400"
            >
              {isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Feed Row ─────────────────────────────────────────────────────────────────

function FeedRow({ feed }: { feed: Feed }) {
  const [editOpen, setEditOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const displayTitle = feed.title ?? feed.url;
  const status = statusConfig[feed.fetchStatus];

  function handleDelete() {
    startTransition(async () => {
      await removeFeedAction({ feedId: feed.id });
      toast.success(`"${displayTitle}" removed`);
    });
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-lg border border-white/8 bg-white/4 hover:border-white/15 hover:bg-white/6 transition-all duration-200">
        <div className="flex items-center gap-3 min-w-0">
          <RssIcon className="size-3.5 text-amber-400 shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-foreground truncate">
                {displayTitle}
              </span>
              <Badge
                className={`text-[9px] font-mono border px-1.5 py-0.5 rounded shrink-0 ${status.className}`}
              >
                {status.label}
              </Badge>
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-[11px] text-muted-foreground font-mono truncate">
                {feed.url}
              </span>
              <span className="text-[10px] text-muted-foreground/60 font-mono shrink-0">
                {feed.lastFetchedAt
                  ? `fetched ${format(new Date(feed.lastFetchedAt), "do MMM yyyy")}`
                  : `added ${format(new Date(feed.createdAt), "do MMM yyyy")}`}
              </span>
            </div>
            {feed.description && (
              <p className="text-[11px] text-muted-foreground/70 mt-0.5 truncate">
                {feed.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {feed.siteUrl && (
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-amber-400 hover:bg-amber-500/10"
            >
              <a
                href={feed.siteUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Visit site"
              >
                <ExternalLinkIcon className="size-3.5" />
              </a>
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground hover:text-amber-400 hover:bg-amber-500/10"
            onClick={() => setEditOpen(true)}
            aria-label={`Edit ${displayTitle}`}
          >
            <PencilIcon className="size-3.5" />
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                disabled={isPending}
                aria-label={`Remove ${displayTitle}`}
              >
                <Trash2Icon className="size-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="dark bg-[oklch(0.13_0_0)] border-white/10 text-foreground">
              <AlertDialogHeader>
                <AlertDialogTitle className="font-[family-name:var(--font-playfair)]">
                  Remove feed?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground">
                  <span className="font-mono text-amber-400">
                    &ldquo;{displayTitle}&rdquo;
                  </span>{" "}
                  will be removed from your subscriptions.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-white/15 bg-white/5 hover:bg-white/10 text-foreground">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-red-600 text-white hover:bg-red-500"
                >
                  Remove
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <EditDialog feed={feed} open={editOpen} onOpenChange={setEditOpen} />
    </>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

type StatusFilter = FetchStatus | "all";

export default function FeedsClient({
  feeds,
  feedsCount,
  subscriptionsCount,
  keywordsCount,
}: {
  feeds: Feed[];
  feedsCount: number;
  subscriptionsCount: number;
  keywordsCount: number;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [titleFilter, setTitleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filteredFeeds = feeds.filter((feed) => {
    const haystack = (feed.title ?? feed.url).toLowerCase();
    const matchesTitle = titleFilter === "" || haystack.includes(titleFilter.toLowerCase());
    const matchesStatus = statusFilter === "all" || feed.fetchStatus === statusFilter;
    return matchesTitle && matchesStatus;
  });

  const isFiltered = titleFilter !== "" || statusFilter !== "all";

  return (
    <div className="dark min-h-screen bg-[oklch(0.09_0_0)] text-foreground">
      {/* Header */}
      <div className="border-b border-white/8 px-6 py-7 lg:px-10">
        <div className="max-w-7xl mx-auto flex items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <RssIcon className="size-4 text-amber-400" />
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
              Feeds
            </h1>
            <p className="text-xs font-mono text-muted-foreground mt-2 tracking-wide">
              {feeds.length} {feeds.length === 1 ? "feed" : "feeds"}
            </p>
          </div>

          <div className="flex items-end gap-6 shrink-0">
            <DashboardNav
              feedsCount={feedsCount}
              subscriptionsCount={subscriptionsCount}
              keywordsCount={keywordsCount}
              activePage="feeds"
            />
            {(["active", "error", "paused", "pending"] as const).map((s) => {
              const count = feeds.filter((f) => f.fetchStatus === s).length;
              const colorMap: Record<FetchStatus, string> = {
                active: "text-emerald-400",
                error: "text-red-400",
                paused: "text-zinc-400",
                pending: "text-yellow-400",
              };
              return (
                <div key={s} className="text-right">
                  <div className={`text-[1.8rem] font-mono font-light leading-none tabular-nums ${colorMap[s]}`}>
                    {count}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1 tracking-widest uppercase font-mono">
                    {s}
                  </div>
                </div>
              );
            })}
            <Button
              className="gap-2 bg-amber-500 text-black hover:bg-amber-400 font-mono text-xs shrink-0"
              onClick={() => setAddOpen(true)}
            >
              <PlusIcon className="size-3.5" />
              Add feed
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      {feeds.length > 0 && (
        <div className="border-b border-white/8 px-6 py-3 lg:px-10">
          <div className="max-w-2xl mx-auto flex items-center gap-2">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/50 pointer-events-none" />
              <Input
                value={titleFilter}
                onChange={(e) => setTitleFilter(e.target.value)}
                placeholder="Filter by title…"
                className={`pl-8 h-8 text-xs font-mono ${inputCls}`}
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as StatusFilter)}
            >
              <SelectTrigger className={`w-36 h-8 text-xs font-mono ${inputCls}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="dark bg-[oklch(0.13_0_0)] border-white/10 text-foreground">
                <SelectItem value="all" className="font-mono text-xs focus:bg-white/8 focus:text-foreground">
                  All statuses
                </SelectItem>
                {FETCH_STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="font-mono text-xs focus:bg-white/8 focus:text-foreground">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* List */}
      <div className="max-w-2xl mx-auto px-6 py-8 lg:px-10">
        {feeds.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-muted-foreground gap-4">
            <RssIcon className="size-14 opacity-10" />
            <p className="font-mono text-sm">No feeds yet.</p>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs font-mono text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
              onClick={() => setAddOpen(true)}
            >
              Add your first feed
            </Button>
          </div>
        ) : filteredFeeds.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-muted-foreground gap-3">
            <SearchIcon className="size-10 opacity-10" />
            <p className="font-mono text-sm">No feeds match the current filters.</p>
          </div>
        ) : (
          <>
            {isFiltered && (
              <p className="text-[10px] font-mono text-muted-foreground/60 tracking-wide mb-3">
                {filteredFeeds.length} of {feeds.length} {feeds.length === 1 ? "feed" : "feeds"}
              </p>
            )}
            <div className="flex flex-col gap-2">
              {filteredFeeds.map((feed) => (
                <FeedRow key={feed.id} feed={feed} />
              ))}
            </div>
          </>
        )}
      </div>

      <AddDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
