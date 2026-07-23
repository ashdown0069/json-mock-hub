import "server-only"
import { QueryClient } from "@tanstack/react-query"
import { serverAxiosInstance } from "@/lib/serverAxios"
import { dashboardKeys } from "@/lib/queryKeys"
import { DashboardStats } from "../types"

export const getDashboardStatsServer = async (
  workspaceId: string
): Promise<DashboardStats> => {
  const { data } = await serverAxiosInstance.get(`/${workspaceId}/dashboard/stats`)
  return data
}

export const prefetchDashboardStats = async (
  queryClient: QueryClient,
  workspaceId: string
) => {
  return queryClient.prefetchQuery({
    queryKey: dashboardKeys.stats(workspaceId),
    queryFn: () => getDashboardStatsServer(workspaceId),
  })
}
