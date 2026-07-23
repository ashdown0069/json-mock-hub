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

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>
}) {
  const { workspaceId } = await params
  const t = await getTranslations("WorkspacePages")

  const queryClient = new QueryClient()

  await Promise.all([
    prefetchDashboardStats(queryClient, workspaceId),
    prefetchRequestLogs(queryClient, workspaceId, 1),
  ])

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="flex-1 p-8 bg-slate-50/50 min-h-full">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold tracking-tight">{t("dashboardTitle")}</h1>
        </div>

        <DashboardStatsCards workspaceId={workspaceId} />
        <RequestLogTable workspaceId={workspaceId} />
      </div>
    </HydrationBoundary>
  )
}
