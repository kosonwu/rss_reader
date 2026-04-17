"use client"

import { useClerk } from "@clerk/nextjs"
import { ArrowRightIcon } from "lucide-react"

export function SignInModalButton() {
  const { openSignIn } = useClerk()
  return (
    <button
      onClick={() => openSignIn({ forceRedirectUrl: "/dashboard" })}
      className="inline-flex items-center gap-2.5 h-11 px-6 bg-amber-500 text-black hover:bg-amber-400 font-mono text-xs tracking-widest uppercase font-semibold rounded-lg cursor-pointer"
    >
      Sign In to Continue
      <ArrowRightIcon className="size-3.5" />
    </button>
  )
}
