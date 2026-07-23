import React from "react"

export default function WorkspacesHeader() {
  return (
    <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-border/50 bg-white px-8 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground">
          J
        </div>
        <span className="text-xl font-bold tracking-tight">JsonMockHub</span>
      </div>
    </header>
  )
}
