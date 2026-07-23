import { useQuery } from "@tanstack/react-query"
import { axiosInstance, type customAxiosError } from "@/lib/axios"
import { dashboardKeys } from "@/lib/queryKeys"
import { DashboardStats } from "../types"

export const DASHBOARD_POLL_INTERVAL_MS = 15_000

export async function getDashboardStats(workspaceId: string): Promise<DashboardStats> {
  const { data } = await axiosInstance.get(`/${workspaceId}/dashboard/stats`)
  return data
}

export function useGetDashboardStats(workspaceId: string) {
  return useQuery<DashboardStats, customAxiosError>({
    queryKey: dashboardKeys.stats(workspaceId),
    queryFn: () => getDashboardStats(workspaceId),
    refetchInterval: DASHBOARD_POLL_INTERVAL_MS,
    staleTime: DASHBOARD_POLL_INTERVAL_MS,
  })
}
