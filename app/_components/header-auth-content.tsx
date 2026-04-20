"use client"

import { Show, UserButton, SignInButton, SignUpButton } from "@clerk/nextjs"

export default function HeaderAuthContent() {
  return (
    <>
      <Show when="signed-out">
        <SignInButton mode="modal" forceRedirectUrl="/dashboard">
          <button className="h-8 px-4 font-mono text-[11px] tracking-widest uppercase text-amber-400 border border-amber-500/30 rounded-md bg-amber-500/5 hover:bg-amber-500/15 transition-colors cursor-pointer">
            Sign In
          </button>
        </SignInButton>
      </Show>
      <Show when="signed-out">
        <SignUpButton mode="modal">
          <button className="h-8 px-4 font-mono text-[11px] tracking-widest uppercase text-black bg-amber-400 rounded-md hover:bg-amber-300 transition-colors cursor-pointer">
            Sign Up
          </button>
        </SignUpButton>
      </Show>
      <Show when="signed-in">
        <UserButton />
      </Show>
    </>
  )
}
