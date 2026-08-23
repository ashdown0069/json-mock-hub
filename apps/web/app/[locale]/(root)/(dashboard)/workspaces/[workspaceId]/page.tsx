import { getTranslations } from "next-intl/server"
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query"
import { DashboardStatsCards } from "@/features/dashboard/components/DashboardStatsCards"
import { RequestLogTable } from "@/features/dashboard/components/RequestLogTable"
import { prefetchDashboardStats } from "@/features/dashboard/api/getDashboardStats.server"
import { prefetchRequestLogs } from "@/features/dashboard/api/getRequestLogs.server"
import { fetchWorkspace } from "@/features/workspace/api/getWorkspace.server"

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>
}) {
  const { workspaceId } = await params
  const t = await getTranslations("WorkspacePages")

  const queryClient = new QueryClient()

  const [workspace] = await Promise.all([
    // API 장애 시 제목만 기본값으로 떨어뜨린다 (대시보드 자체는 렌더한다)
    fetchWorkspace(queryClient, workspaceId).catch(() => null),
    prefetchDashboardStats(queryClient, workspaceId),
    prefetchRequestLogs(queryClient, workspaceId, 1),
  ])

  const titleText = workspace?.name
    ? t("dashboardTitleWithName", { name: workspace.name })
    : t("dashboardTitle")

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="flex h-full flex-1 flex-col overflow-hidden bg-slate-50/50 p-6 md:p-8">
        <div className="mb-6 flex shrink-0 items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">{titleText}</h1>
        </div>

        <div className="shrink-0">
          <DashboardStatsCards workspaceId={workspaceId} />
        </div>
        <RequestLogTable workspaceId={workspaceId} />
      </div>
    </HydrationBoundary>
  )
}
