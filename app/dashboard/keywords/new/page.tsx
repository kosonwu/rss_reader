"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeftIcon, TagIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { createKeywordAction } from "./actions";

export default function NewKeywordPage() {
  const [keyword, setKeyword] = useState("");
  const [isCaseSensitive, setIsCaseSensitive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createKeywordAction({ keyword, isCaseSensitive });
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="dark min-h-screen bg-[oklch(0.09_0_0)] text-foreground">
      {/* Header */}
      <div className="border-b border-white/8 px-6 py-7 lg:px-10">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <TagIcon className="size-4 text-amber-400" />
            <span className="text-[10px] font-mono text-amber-400 tracking-[0.25em] uppercase">
              RSS Reader
            </span>
          </div>
          <h1 className="text-[2.2rem] font-[family-name:var(--font-playfair)] font-bold tracking-tight leading-none">
            New Keyword
          </h1>
          <p className="text-xs font-mono text-muted-foreground mt-2 tracking-wide">
            Add a keyword to filter articles in your feed
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-6 py-8 lg:px-10">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="keyword" className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
              Keyword
            </Label>
            <Input
              id="keyword"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="e.g. TypeScript"
              required
              className="border-white/15 bg-white/5 focus-visible:ring-amber-500/50 font-mono"
            />
          </div>

          <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-white/8 bg-white/4">
            <Checkbox
              id="isCaseSensitive"
              checked={isCaseSensitive}
              onCheckedChange={(checked) => setIsCaseSensitive(checked === true)}
            />
            <div>
              <Label htmlFor="isCaseSensitive" className="font-mono text-sm cursor-pointer">
                Case sensitive
              </Label>
              <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                Match exact casing — e.g. &ldquo;TypeScript&rdquo; won&apos;t match &ldquo;typescript&rdquo;
              </p>
            </div>
          </div>

          {error && (
            <p className="text-sm font-mono text-red-400">{error}</p>
          )}

          <div className="flex items-center gap-3 pt-2">
            <Button
              type="submit"
              disabled={isPending}
              className="bg-amber-500 text-black hover:bg-amber-400 font-mono text-xs"
            >
              {isPending ? "Saving…" : "Create keyword"}
            </Button>
            <Button
              asChild
              type="button"
              variant="ghost"
              className="font-mono text-xs text-muted-foreground hover:text-foreground hover:bg-white/8 gap-1.5"
            >
              <Link href="/dashboard/keywords">
                <ArrowLeftIcon className="size-3.5" />
                Cancel
              </Link>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
