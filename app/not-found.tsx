import Link from "next/link"
import { RssIcon, ArrowLeftIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="dark min-h-screen bg-[oklch(0.09_0_0)] text-foreground flex flex-col">

      {/* ── Header ── */}
      <div className="border-b border-white/8 px-6 py-7 lg:px-10">
        <div className="max-w-4xl mx-auto flex items-center gap-2">
          <RssIcon className="size-4 text-amber-400" />
          <span className="text-[10px] font-mono text-amber-400 tracking-[0.25em] uppercase">
            RSS Reader
          </span>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="mb-6">
          <span className="font-mono text-[6rem] font-light text-amber-400/20 leading-none tabular-nums select-none">
            404
          </span>
        </div>

        <h1 className="font-[family-name:var(--font-playfair)] text-[2rem] font-bold tracking-tight leading-tight mb-3">
          Page not found
        </h1>
        <p className="text-sm font-mono text-muted-foreground max-w-xs mb-10">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <Button
          asChild
          className="gap-2 h-10 px-5 bg-amber-500 text-black hover:bg-amber-400 font-mono text-xs tracking-widest uppercase font-semibold rounded-lg"
        >
          <Link href="/">
            <ArrowLeftIcon className="size-3.5" />
            Back to Home
          </Link>
        </Button>
      </div>

      {/* ── Footer ── */}
      <div className="border-t border-white/8 px-6 py-6 lg:px-10">
        <div className="max-w-4xl mx-auto flex items-center gap-2">
          <RssIcon className="size-3.5 text-amber-400" />
          <span className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">
            RSS Reader
          </span>
        </div>
      </div>

    </div>
  )
}
