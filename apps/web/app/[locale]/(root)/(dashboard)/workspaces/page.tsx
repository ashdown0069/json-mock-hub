import React from "react"
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query"
import { Workspaces } from "@/features/workspace/components/Workspaces"
import WorkspacesHeader from "@/features/workspace/components/WorkspacesHeader"
import { prefetchWorkspaceList } from "@/features/workspace/api/getWorkspaceList.server"

const WorkspacesPage = async () => {
  const queryClient = new QueryClient()

  // 공통 헬퍼 함수를 통해 서버 사이드 프리페치 수행
  await prefetchWorkspaceList(queryClient)

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <main className="w-full bg-slate-50">
        <WorkspacesHeader />
        <div className="mx-auto w-full max-w-5xl space-y-8 p-5">
          <Workspaces />
        </div>
      </main>
    </HydrationBoundary>
  )
}

export default WorkspacesPage
