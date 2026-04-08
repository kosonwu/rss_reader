"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { PlusIcon, Trash2Icon, TagIcon, PencilIcon, ArrowLeftIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { deleteKeywordAction, updateKeywordAction } from "../actions";

type Keyword = {
  id: string;
  keyword: string;
  isCaseSensitive: boolean;
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

// ── Keyword Row ───────────────────────────────────────────────────────────────

function KeywordRow({ keyword }: { keyword: Keyword }) {
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
      <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-lg border border-white/8 bg-white/4 hover:border-white/15 hover:bg-white/6 transition-all duration-200">
        <div className="flex items-center gap-3 min-w-0">
          <TagIcon className="size-3.5 text-amber-400 shrink-0" />
          <span className="font-mono text-sm text-foreground truncate">
            {keyword.keyword}
          </span>
          {keyword.isCaseSensitive && (
            <Badge className="text-[9px] font-mono bg-violet-500/15 text-violet-400 border border-violet-500/25 px-1.5 py-0.5 rounded shrink-0">
              Aa
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
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
      </div>

      <EditDialog
        keyword={keyword}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function KeywordsClient({ keywords }: { keywords: Keyword[] }) {
  return (
    <div className="dark min-h-screen bg-[oklch(0.09_0_0)] text-foreground">
      {/* Header */}
      <div className="border-b border-white/8 px-6 py-7 lg:px-10">
        <div className="max-w-2xl mx-auto flex items-end justify-between gap-4">
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

          <Button
            asChild
            className="gap-2 bg-amber-500 text-black hover:bg-amber-400 font-mono text-xs shrink-0"
          >
            <Link href="/dashboard/keywords/new">
              <PlusIcon className="size-3.5" />
              Add keyword
            </Link>
          </Button>
        </div>
      </div>

      {/* List */}
      <div className="max-w-2xl mx-auto px-6 py-8 lg:px-10">
        {keywords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-muted-foreground gap-4">
            <TagIcon className="size-14 opacity-10" />
            <p className="font-mono text-sm">No keywords yet.</p>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="text-xs font-mono text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
            >
              <Link href="/dashboard/keywords/new">Add your first keyword</Link>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {keywords.map((kw) => (
              <KeywordRow key={kw.id} keyword={kw} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
