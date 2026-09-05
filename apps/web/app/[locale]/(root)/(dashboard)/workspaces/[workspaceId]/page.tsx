import React from "react"
import { DashboardTitle } from "@/features/dashboard/components/DashboardTitle"
import { DashboardStatsCards } from "@/features/dashboard/components/DashboardStatsCards"
import { RequestLogTable } from "@/features/dashboard/components/RequestLogTable"

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>
}) {
  const { workspaceId } = await params

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden bg-slate-50/50 p-6 md:p-8">
      <div className="mb-6 flex shrink-0 items-center justify-between">
        <DashboardTitle workspaceId={workspaceId} />
      </div>

      <div className="shrink-0">
        <DashboardStatsCards workspaceId={workspaceId} />
      </div>
      <RequestLogTable workspaceId={workspaceId} />
    </div>
  )
}
