"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { BrainCircuitIcon, SearchIcon, XIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

export function SemanticSearchBar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()

  const urlQuery = searchParams.get("q") ?? ""
  const [inputValue, setInputValue] = useState(urlQuery)

  // Sync input when URL changes (browser back/forward)
  useEffect(() => { setInputValue(urlQuery) }, [urlQuery])

  // Only show on main dashboard page
  if (pathname !== "/dashboard") return null

  function commit(value: string) {
    const trimmed = value.trim()
    const p = new URLSearchParams(searchParams.toString())
    if (trimmed) {
      p.set("q", trimmed)
    } else {
      p.delete("q")
    }
    p.delete("page")
    const qs = p.toString()
    router.replace(qs ? `/dashboard?${qs}` : "/dashboard")
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") commit(inputValue)
    if (e.key === "Escape") handleClear()
  }

  function handleClear() {
    setInputValue("")
    const p = new URLSearchParams(searchParams.toString())
    p.delete("q")
    p.delete("page")
    const qs = p.toString()
    router.replace(qs ? `/dashboard?${qs}` : "/dashboard")
  }

  return (
    <div className="relative flex items-center">
      <SearchIcon className="absolute left-2.5 size-3.5 text-amber-400 pointer-events-none z-10" />
      <Input
        type="text"
        placeholder="Semantic search… ↵"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className="h-8 pl-8 pr-7 w-[220px] font-mono text-xs text-white/90 placeholder:text-white/30 border-white/15 bg-white/5 hover:bg-white/10 focus-visible:border-amber-500/50 focus-visible:ring-amber-500/20"
      />
      {inputValue && (
        <button
          onClick={handleClear}
          className="absolute right-2 text-white/30 hover:text-white/70 transition-colors"
          aria-label="Clear search"
        >
          <XIcon className="size-3" />
        </button>
      )}
      {urlQuery && (
        <Badge className="absolute -top-1.5 -right-1.5 text-[8px] font-mono bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1 py-0 rounded flex items-center gap-0.5 pointer-events-none">
          <BrainCircuitIcon className="size-2.5" />
          semantic
        </Badge>
      )}
    </div>
  )
}
