"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Switch } from "@/components/ui/switch"
import { SparklesIcon } from "lucide-react"

export function PreferenceSortToggle() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()

  // 只在 /dashboard 主頁顯示（不含子頁面）
  if (pathname !== "/dashboard") return null

  const isPreference = searchParams.get("sort") === "preference"

  function handleToggle(checked: boolean) {
    const p = new URLSearchParams(searchParams.toString())
    if (checked) {
      p.set("sort", "preference")
    } else {
      p.delete("sort")
    }
    p.delete("page")
    const qs = p.toString()
    router.replace(qs ? `/dashboard?${qs}` : "/dashboard")
  }

  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor="pref-sort"
        className={`flex items-center gap-1 text-[10px] font-mono uppercase tracking-[0.2em] cursor-pointer select-none transition-colors ${
          isPreference ? "text-amber-400" : "text-white/40"
        }`}
      >
        <SparklesIcon className="size-3 text-amber-400" />
        Smart Sort
      </label>
      <Switch
        id="pref-sort"
        checked={isPreference}
        onCheckedChange={handleToggle}
        className="data-[state=checked]:bg-amber-500 data-[state=unchecked]:bg-white/20"
      />
    </div>
  )
}
