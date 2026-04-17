"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { PlusIcon, Trash2Icon, TagIcon, PencilIcon, ArrowLeftIcon, SearchIcon } from "lucide-react";
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
import { createKeywordAction, deleteKeywordAction, updateKeywordAction } from "../actions";

const PAGE_SIZE = 10;

type Keyword = {
  id: string;
  keyword: string;
  isCaseSensitive: boolean;
  createdAt: Date;
};

// ── Edit Dialog ───────────────────────────────────────────────────────────────

function EditDialog({
  keyword,
  open,
  onOpenChange,
}: {
  keyword: Keyword;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [value, setValue] = useState(keyword.keyword);
  const [caseSensitive, setCaseSensitive] = useState(keyword.isCaseSensitive);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateKeywordAction({
        keywordId: keyword.id,
        keyword: value,
        isCaseSensitive: caseSensitive,
      });
      if (result?.error) {
        toast.error(result.error);
      } else {
        onOpenChange(false);
        toast.success("Keyword updated");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dark bg-[oklch(0.13_0_0)] border-white/10 text-foreground sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-[family-name:var(--font-playfair)]">
            Edit keyword
          </DialogTitle>
          <DialogDescription className="sr-only">Edit keyword filter</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 pt-1">
          <div className="space-y-2">
            <Label htmlFor="edit-keyword">Keyword</Label>
            <Input
              id="edit-keyword"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              required
              className="border-white/15 bg-white/5 focus-visible:ring-amber-500/50"
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="edit-case"
              checked={caseSensitive}
              onCheckedChange={(checked) => setCaseSensitive(checked === true)}
            />
            <Label htmlFor="edit-case">Case sensitive</Label>
          </div>
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="border-white/15 bg-white/5 hover:bg-white/10">
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

// ── Add Dialog ────────────────────────────────────────────────────────────────

function AddDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [value, setValue] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await createKeywordAction({
        keyword: value,
        isCaseSensitive: caseSensitive,
      });
      if (result?.error) {
        toast.error(result.error);
      } else {
        setValue("");
        setCaseSensitive(false);
        onOpenChange(false);
        toast.success(`Saved '${value}' as keyword`);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dark bg-[oklch(0.13_0_0)] border-white/10 text-foreground sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-[family-name:var(--font-playfair)]">
            Add keyword
          </DialogTitle>
          <DialogDescription className="sr-only">Add a new keyword filter</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 pt-1">
          <div className="space-y-2">
            <Label htmlFor="add-keyword">Keyword</Label>
            <Input
              id="add-keyword"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              required
              className="border-white/15 bg-white/5 focus-visible:ring-amber-500/50"
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="add-case"
              checked={caseSensitive}
              onCheckedChange={(checked) => setCaseSensitive(checked === true)}
            />
            <Label htmlFor="add-case">Case sensitive</Label>
          </div>
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="border-white/15 bg-white/5 hover:bg-white/10">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-amber-500 text-black hover:bg-amber-400"
            >
              {isPending ? "Adding…" : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Keyword Table Row ─────────────────────────────────────────────────────────

function KeywordTableRow({ keyword }: { keyword: Keyword }) {
  const [editOpen, setEditOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteKeywordAction({ keywordId: keyword.id });
      toast.success(`"${keyword.keyword}" deleted`);
    });
  }

  return (
    <>
      <TableRow className="border-white/8 hover:bg-white/4 transition-colors duration-150">
        <TableCell>
          <div className="flex items-center gap-2">
            <TagIcon className="size-3.5 text-amber-400 shrink-0" />
            <span className="font-mono text-sm text-foreground">{keyword.keyword}</span>
          </div>
        </TableCell>
        <TableCell>
          <Badge
            className={`text-[9px] font-mono border px-1.5 py-0.5 rounded ${
              keyword.isCaseSensitive
                ? "bg-violet-500/15 text-violet-400 border-violet-500/25"
                : "bg-white/8 text-muted-foreground border-white/10"
            }`}
          >
            {keyword.isCaseSensitive ? "Case sensitive" : "Case insensitive"}
          </Badge>
        </TableCell>
        <TableCell className="font-mono text-[11px] text-muted-foreground">
          {format(keyword.createdAt, "do MMM yyyy")}
        </TableCell>
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-amber-400 hover:bg-amber-500/10"
              onClick={() => setEditOpen(true)}
              aria-label={`Edit ${keyword.keyword}`}
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
                  aria-label={`Delete ${keyword.keyword}`}
                >
                  <Trash2Icon className="size-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="dark bg-[oklch(0.13_0_0)] border-white/10 text-foreground">
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-[family-name:var(--font-playfair)]">
                    Delete keyword?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-muted-foreground">
                    <span className="font-mono text-amber-400">&ldquo;{keyword.keyword}&rdquo;</span> will be permanently removed. This cannot be undone.
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
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </TableCell>
      </TableRow>

      <EditDialog keyword={keyword} open={editOpen} onOpenChange={setEditOpen} />
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const inputCls =
  "border-white/15 bg-white/5 focus-visible:ring-amber-500/50 text-foreground placeholder:text-muted-foreground/50";

export default function KeywordsClient({
  keywords,
  feedsCount,
  subscriptionsCount,
  keywordsCount,
  bookmarksCount,
}: {
  keywords: Keyword[];
  feedsCount: number;
  subscriptionsCount: number;
  keywordsCount: number;
  bookmarksCount: number;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [keywordFilter, setKeywordFilter] = useState("");
  const [page, setPage] = useState(1);

  const filteredKeywords = keywords.filter(
    (kw) => keywordFilter === "" || kw.keyword.toLowerCase().includes(keywordFilter.toLowerCase()),
  );

  const totalPages = Math.ceil(filteredKeywords.length / PAGE_SIZE);
  const pagedKeywords = filteredKeywords.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const isFiltered = keywordFilter !== "";

  function handleFilterChange(e: React.ChangeEvent<HTMLInputElement>) {
    setKeywordFilter(e.target.value);
    setPage(1);
  }

  return (
    <div className="dark min-h-screen bg-[oklch(0.09_0_0)] text-foreground">
      {/* Header */}
      <div className="border-b border-white/8 px-6 py-7 lg:px-10">
        <div className="max-w-7xl mx-auto flex items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TagIcon className="size-4 text-amber-400" />
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
              Keywords
            </h1>
            <p className="text-xs font-mono text-muted-foreground mt-2 tracking-wide">
              {keywords.length} {keywords.length === 1 ? "keyword" : "keywords"}
            </p>
          </div>

          <div className="flex items-end gap-4 shrink-0">
            <DashboardNav
              feedsCount={feedsCount}
              subscriptionsCount={subscriptionsCount}
              keywordsCount={keywordsCount}
              bookmarksCount={bookmarksCount}
              activePage="keywords"
            />
            <Button
              className="gap-2 bg-amber-500 text-black hover:bg-amber-400 font-mono text-xs shrink-0"
              onClick={() => setAddOpen(true)}
            >
              <PlusIcon className="size-3.5" />
              Add keyword
            </Button>
          </div>
        </div>
      </div>

      {/* Filter */}
      {keywords.length > 0 && (
        <div className="border-b border-white/8 px-6 py-3 lg:px-10">
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/50 pointer-events-none" />
              <Input
                value={keywordFilter}
                onChange={handleFilterChange}
                placeholder="Filter by keyword…"
                className={`pl-8 h-8 text-xs font-mono ${inputCls}`}
              />
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-8 lg:px-10">
        {keywords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-muted-foreground gap-4">
            <TagIcon className="size-14 opacity-10" />
            <p className="font-mono text-sm">No keywords yet.</p>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs font-mono text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
              onClick={() => setAddOpen(true)}
            >
              Add your first keyword
            </Button>
          </div>
        ) : filteredKeywords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-muted-foreground gap-3">
            <SearchIcon className="size-10 opacity-10" />
            <p className="font-mono text-sm">No keywords match the current filter.</p>
          </div>
        ) : (
          <>
            {isFiltered && (
              <p className="text-[10px] font-mono text-muted-foreground/60 tracking-wide mb-3">
                {filteredKeywords.length} of {keywords.length}{" "}
                {keywords.length === 1 ? "keyword" : "keywords"}
              </p>
            )}

            <div className="rounded-lg border border-white/8 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/8 hover:bg-transparent">
                    <TableHead className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase">
                      Keyword
                    </TableHead>
                    <TableHead className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase">
                      Case
                    </TableHead>
                    <TableHead className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase">
                      Added
                    </TableHead>
                    <TableHead className="w-[80px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedKeywords.map((kw) => (
                    <KeywordTableRow key={kw.id} keyword={kw} />
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

      <AddDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
