"use client"

import dynamic from "next/dynamic"

const HeaderAuthContent = dynamic(() => import("./header-auth-content"), { ssr: false })

export function HeaderAuth() {
  return <HeaderAuthContent />
}
