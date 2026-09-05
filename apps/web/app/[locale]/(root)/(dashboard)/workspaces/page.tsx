import React from "react"
import { Workspaces } from "@/features/workspace/components/Workspaces"
import { Header } from "@/components/Header"

export default function WorkspacesPage() {
  return (
    <main className="w-full bg-slate-50 min-h-screen">
      <Header showLogout />
      <div className="mx-auto w-full max-w-5xl space-y-8 p-5">
        <Workspaces />
      </div>
    </main>
  )
}
