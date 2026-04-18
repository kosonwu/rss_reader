"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  BookmarkIcon,
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
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  subscribeAction,
  unsubscribeAction,
  updateSubscriptionAction,
} from "../actions";

const PAGE_SIZE = 10;

// ── Types ─────────────────────────────────────────────────────────────────────

type Subscription = {
  id: string;
  feedId: string;
  displayName: string | null;
  isActive: boolean;
  subscribedAt: string;
  feedTitle: string | null;
  feedUrl: string;
  feedSiteUrl: string | null;
  feedDescription: string | null;
};

type AvailableFeed = {
  id: string;
  title: string | null;
  url: string;
  description: string | null;
};

// ── Shared field styles ───────────────────────────────────────────────────────

const inputCls =
  "border-white/15 bg-white/5 focus-visible:ring-amber-500/50 text-foreground placeholder:text-muted-foreground/50";
const labelCls = "text-sm text-foreground/80";

// ── Add Dialog ────────────────────────────────────────────────────────────────

function AddDialog({
  open,
  onOpenChange,
  availableFeeds,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableFeeds: AvailableFeed[];
}) {
  const [feedId, setFeedId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isPending, startTransition] = useTransition();

  const selectedFeed = availableFeeds.find((f) => f.id === feedId) ?? null;

  function handleFeedChange(id: string) {
    setFeedId(id);
    const feed = availableFeeds.find((f) => f.id === id);
    const desc = feed?.description ?? "";
    setDisplayName(desc.length > 30 ? desc.slice(0, 30) + "…" : desc);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!feedId) return;
    startTransition(async () => {
      const result = await subscribeAction({
        feedId,
        displayName: displayName.trim() || null,
        isActive,
      });
      if (result?.error) {
        toast.error(result.error);
      } else {
        setFeedId("");
        setDisplayName("");
        setIsActive(true);
        onOpenChange(false);
        toast.success(`Subscribed to '${displayName.trim() || selectedFeed?.title || selectedFeed?.url || feedId}'`);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dark bg-[oklch(0.13_0_0)] border-white/10 text-foreground sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-[family-name:var(--font-playfair)]">
            Add subscription
          </DialogTitle>
          <DialogDescription className="sr-only">Add a new feed subscription</DialogDescription>
        </DialogHeader>
        {availableFeeds.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            You are already subscribed to all available feeds.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div className="space-y-2">
              <Label htmlFor="sub-feed" className={labelCls}>
                Feed <span className="text-amber-400">*</span>
              </Label>
              <Select value={feedId} onValueChange={handleFeedChange}>
                <SelectTrigger id="sub-feed" className={`w-full ${inputCls}`}>
                  <SelectValue placeholder="Select a feed…" />
                </SelectTrigger>
                <SelectContent className="dark bg-[oklch(0.13_0_0)] border-white/10 text-foreground">
                  {availableFeeds.map((f) => (
                    <SelectItem
                      key={f.id}
                      value={f.id}
                      className="font-mono text-sm focus:bg-white/8 focus:text-foreground"
                    >
                      {f.title ?? f.url}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedFeed?.description && (
              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {selectedFeed.description}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="sub-display-name" className={labelCls}>
                Display name
              </Label>
              <Input
                id="sub-display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Leave empty to use feed title"
                className={inputCls}
              />
              <p className="text-[11px] text-muted-foreground">
                Overrides the feed title in your view only.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="sub-active"
                checked={isActive}
                onCheckedChange={(checked) => setIsActive(checked === true)}
              />
              <Label htmlFor="sub-active" className={labelCls}>Active</Label>
            </div>
            <DialogFooter className="gap-2 pt-2">
              <DialogClose asChild>
                <Button type="button" variant="outline" className="border-white/15 bg-white/5 hover:bg-white/10">
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={isPending || !feedId}
                className="bg-amber-500 text-black hover:bg-amber-400"
              >
                {isPending ? "Subscribing…" : "Subscribe"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Edit Dialog ───────────────────────────────────────────────────────────────

function EditDialog({
  subscription,
  open,
  onOpenChange,
}: {
  subscription: Subscription;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [displayName, setDisplayName] = useState(subscription.displayName ?? "");
  const [isActive, setIsActive] = useState(subscription.isActive);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateSubscriptionAction({
        subscriptionId: subscription.id,
        displayName: displayName.trim() || null,
        isActive,
      });
      if (result?.error) {
        toast.error(result.error);
      } else {
        onOpenChange(false);
        toast.success(`Updated '${displayName.trim() || subscription.feedTitle || subscription.feedUrl}'`);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dark bg-[oklch(0.13_0_0)] border-white/10 text-foreground sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-[family-name:var(--font-playfair)]">
            Edit subscription
          </DialogTitle>
          <DialogDescription className="sr-only">Edit subscription settings</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 pt-1">
          <div className="space-y-2">
            <Label className={labelCls}>Feed</Label>
            <p className="text-sm font-mono text-muted-foreground truncate">
              {subscription.feedUrl}
            </p>
          </div>
          {subscription.feedDescription && (
            <div className="space-y-1">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {subscription.feedDescription}
              </p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="edit-display-name" className={labelCls}>
              Display name
            </Label>
            <Input
              id="edit-display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Leave empty to use feed title"
              className={inputCls}
            />
            <p className="text-[11px] text-muted-foreground">
              Overrides the feed title in your view only.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="edit-active"
              checked={isActive}
              onCheckedChange={(checked) => setIsActive(checked === true)}
            />
            <Label htmlFor="edit-active" className={labelCls}>Active</Label>
          </div>
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="border-white/15 bg-white/5 hover:bg-white/10">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPending} className="bg-amber-500 text-black hover:bg-amber-400">
              {isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Subscription Table Row ────────────────────────────────────────────────────

function SubscriptionTableRow({ subscription }: { subscription: Subscription }) {
  const [editOpen, setEditOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const displayTitle =
    subscription.displayName ?? subscription.feedTitle ?? subscription.feedUrl;

  function handleUnsubscribe() {
    startTransition(async () => {
      await unsubscribeAction({ subscriptionId: subscription.id });
      toast.success(`Removed '${displayTitle}'`);
    });
  }

  return (
    <>
      <TableRow className="border-white/8 hover:bg-white/4 transition-colors duration-150">
        <TableCell>
          <div className="flex items-center gap-2 min-w-0">
            <RssIcon className="size-3.5 text-amber-400 shrink-0" />
            <div className="min-w-0">
              <span className="font-mono text-sm text-foreground truncate block">
                {displayTitle}
              </span>
              <span className="font-mono text-[11px] text-muted-foreground truncate block">
                {subscription.feedUrl}
              </span>
            </div>
          </div>
        </TableCell>
        <TableCell>
          <Badge
            className={`text-[9px] font-mono border px-1.5 py-0.5 rounded ${
              subscription.isActive
                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
                : "bg-zinc-500/15 text-zinc-400 border-zinc-500/25"
            }`}
          >
            {subscription.isActive ? "Active" : "Paused"}
          </Badge>
        </TableCell>
        <TableCell className="font-mono text-[11px] text-muted-foreground whitespace-nowrap">
          {format(new Date(subscription.subscribedAt), "do MMM yyyy")}
        </TableCell>
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-1">
            {subscription.feedSiteUrl && (
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-amber-400 hover:bg-amber-500/10"
              >
                <a
                  href={subscription.feedSiteUrl}
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
                  aria-label={`Unsubscribe from ${displayTitle}`}
                >
                  <Trash2Icon className="size-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="dark bg-[oklch(0.13_0_0)] border-white/10 text-foreground">
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-[family-name:var(--font-playfair)]">
                    Unsubscribe?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-muted-foreground">
                    <span className="font-mono text-amber-400">&ldquo;{displayTitle}&rdquo;</span>{" "}
                    will be removed from your subscriptions.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="border-white/15 bg-white/5 hover:bg-white/10 text-foreground">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction onClick={handleUnsubscribe} className="bg-red-600 text-white hover:bg-red-500">
                    Unsubscribe
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </TableCell>
      </TableRow>

      <EditDialog subscription={subscription} open={editOpen} onOpenChange={setEditOpen} />
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

type ActiveFilter = "all" | "active" | "paused";

export default function SubscriptionsClient({
  subscriptions,
  availableFeeds,
  feedsCount,
  subscriptionsCount,
  keywordsCount,
  bookmarksCount,
}: {
  subscriptions: Subscription[];
  availableFeeds: AvailableFeed[];
  feedsCount: number;
  subscriptionsCount: number;
  keywordsCount: number;
  bookmarksCount: number;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [nameFilter, setNameFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [page, setPage] = useState(1);

  const filteredSubscriptions = subscriptions.filter((s) => {
    const haystack = (s.displayName ?? s.feedTitle ?? s.feedUrl).toLowerCase();
    const matchesName = nameFilter === "" || haystack.includes(nameFilter.toLowerCase());
    const matchesActive =
      activeFilter === "all" ||
      (activeFilter === "active" && s.isActive) ||
      (activeFilter === "paused" && !s.isActive);
    return matchesName && matchesActive;
  });

  const totalPages = Math.ceil(filteredSubscriptions.length / PAGE_SIZE);
  const pagedSubscriptions = filteredSubscriptions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const isFiltered = nameFilter !== "" || activeFilter !== "all";

  function handleNameFilterChange(e: React.ChangeEvent<HTMLInputElement>) {
    setNameFilter(e.target.value);
    setPage(1);
  }

  function handleActiveFilterChange(v: string) {
    setActiveFilter(v as ActiveFilter);
    setPage(1);
  }

  return (
    <div className="dark min-h-screen bg-[oklch(0.09_0_0)] text-foreground">
      {/* Header */}
      <div className="border-b border-white/8 px-6 py-7 lg:px-10">
        <div className="max-w-7xl mx-auto flex items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BookmarkIcon className="size-4 text-amber-400" />
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
              Subscriptions
            </h1>
            <p className="text-xs font-mono text-muted-foreground mt-2 tracking-wide">
              {subscriptions.length}{" "}
              {subscriptions.length === 1 ? "subscription" : "subscriptions"}
            </p>
          </div>

          <div className="flex items-end gap-4 shrink-0">
            <DashboardNav
              feedsCount={feedsCount}
              subscriptionsCount={subscriptionsCount}
              keywordsCount={keywordsCount}
              bookmarksCount={bookmarksCount}
              activePage="subscriptions"
            />
            <Button
              className="gap-2 bg-amber-500 text-black hover:bg-amber-400 font-mono text-xs shrink-0"
              onClick={() => setAddOpen(true)}
            >
              <PlusIcon className="size-3.5" />
              Add subscription
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      {subscriptions.length > 0 && (
        <div className="border-b border-white/8 px-6 py-3 lg:px-10">
          <div className="max-w-4xl mx-auto flex items-center gap-2">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/50 pointer-events-none" />
              <Input
                value={nameFilter}
                onChange={handleNameFilterChange}
                placeholder="Filter by display name…"
                className={`pl-8 h-8 text-xs font-mono ${inputCls}`}
              />
            </div>
            <Select value={activeFilter} onValueChange={handleActiveFilterChange}>
              <SelectTrigger className={`w-36 h-8 text-xs font-mono ${inputCls}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="dark bg-[oklch(0.13_0_0)] border-white/10 text-foreground">
                <SelectItem value="all" className="font-mono text-xs focus:bg-white/8 focus:text-foreground">
                  All statuses
                </SelectItem>
                <SelectItem value="active" className="font-mono text-xs focus:bg-white/8 focus:text-foreground">
                  Active
                </SelectItem>
                <SelectItem value="paused" className="font-mono text-xs focus:bg-white/8 focus:text-foreground">
                  Paused
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8 lg:px-10">
        {subscriptions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-muted-foreground gap-4">
            <BookmarkIcon className="size-14 opacity-10" />
            <p className="font-mono text-sm">No subscriptions yet.</p>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs font-mono text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
              onClick={() => setAddOpen(true)}
            >
              Add your first subscription
            </Button>
          </div>
        ) : filteredSubscriptions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-muted-foreground gap-3">
            <SearchIcon className="size-10 opacity-10" />
            <p className="font-mono text-sm">No subscriptions match the current filters.</p>
          </div>
        ) : (
          <>
            {isFiltered && (
              <p className="text-[10px] font-mono text-muted-foreground/60 tracking-wide mb-3">
                {filteredSubscriptions.length} of {subscriptions.length}{" "}
                {subscriptions.length === 1 ? "subscription" : "subscriptions"}
              </p>
            )}

            <div className="rounded-lg border border-white/8 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/8 hover:bg-transparent">
                    <TableHead className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase">
                      Feed
                    </TableHead>
                    <TableHead className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase">
                      Status
                    </TableHead>
                    <TableHead className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase whitespace-nowrap">
                      Subscribed
                    </TableHead>
                    <TableHead className="w-[100px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedSubscriptions.map((s) => (
                    <SubscriptionTableRow key={s.id} subscription={s} />
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

      <AddDialog open={addOpen} onOpenChange={setAddOpen} availableFeeds={availableFeeds} />
    </div>
  );
}
