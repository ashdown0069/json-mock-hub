import React from "react"
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query"
import { Workspaces } from "@/features/workspace/components/Workspaces"
import { Header } from "@/components/Header"
import { prefetchWorkspaceList } from "@/features/workspace/api/getWorkspaceList.server"

const WorkspacesPage = async () => {
  const queryClient = new QueryClient()

  await prefetchWorkspaceList(queryClient)

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <main className="w-full bg-slate-50 min-h-screen">
        <Header showLogout />
        <div className="mx-auto w-full max-w-5xl space-y-8 p-5">
          <Workspaces />
        </div>
      </main>
    </HydrationBoundary>
  )
}

export default WorkspacesPage
