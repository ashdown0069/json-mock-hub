"use client"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Activity, Server } from "lucide-react"
import { useGetDashboardStats } from "../api/getDashboardStats"

export function DashboardStatsCards({ workspaceId }: { workspaceId: string }) {
  const { data: stats, isPending, isError } = useGetDashboardStats(workspaceId)

  // 로딩 중에는 skeleton, 에러 시에는 "-" 로 표기한다 (기존 페이지에 별도 에러 UI 컨벤션 없음)
  const renderValue = (value: number | undefined) => {
    if (isPending) return <Skeleton className="h-8 w-16" />
    if (isError || value === undefined)
      return <div className="text-2xl font-bold text-slate-700">-</div>
    return <div className="text-2xl font-bold text-slate-800">{value.toLocaleString()}</div>
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
      <Card className="transition-all hover:shadow-md border-slate-100">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-500">Total API Routes</CardTitle>
          <Server className="h-4 w-4 text-slate-400" />
        </CardHeader>
        <CardContent>
          {renderValue(stats?.totalRoutes)}
          <p className="text-xs text-slate-400 mt-1">Active mock endpoints</p>
        </CardContent>
      </Card>
      <Card className="transition-all hover:shadow-md border-slate-100">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-500">Request Volume</CardTitle>
          <Activity className="h-4 w-4 text-slate-400" />
        </CardHeader>
        <CardContent>
          {renderValue(stats?.requestVolume24h)}
          <p className="text-xs text-slate-400 mt-1">Requests in the last 24h</p>
        </CardContent>
      </Card>
      {/* Workspace Status는 사용자 결정에 따라 정적 유지 */}
      <Card className="transition-all hover:shadow-md border-slate-100">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-500">Workspace Status</CardTitle>
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-emerald-600">Healthy</div>
          <p className="text-xs text-slate-400 mt-1">All systems operational</p>
        </CardContent>
      </Card>
    </div>
  )
}
