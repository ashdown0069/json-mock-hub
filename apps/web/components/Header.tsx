import React from "react"
import { Logo } from "./Logo"
import { LogoutButton } from "@/features/auth/components/LogoutButton"

export interface HeaderProps {
  showLogout?: boolean
  rightSlot?: React.ReactNode
}

export function Header({ showLogout = false, rightSlot }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-border/60 bg-background/80 px-6 sm:px-8 backdrop-blur-md">
      <Logo href="/" size="md" />
      <div className="flex items-center gap-2">
        {rightSlot}
        {showLogout && <LogoutButton />}
      </div>
    </header>
  )
}


