import React from "react"
import { LandingHeader } from "./LandingHeader"
import { LandingHero } from "./LandingHero"

export function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-foreground flex flex-col font-sans selection:bg-primary/20">
      <LandingHeader />
      <main className="flex-1 flex flex-col lg:flex-row w-full h-full relative">
        <LandingHero />
        {children}
      </main>
    </div>
  )
}
