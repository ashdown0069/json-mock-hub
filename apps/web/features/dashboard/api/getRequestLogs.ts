import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { axiosInstance, type customAxiosError } from "@/lib/axios"
import { dashboardKeys } from "@/lib/queryKeys"
import { RequestLogsResponse } from "../types"
import { DASHBOARD_POLL_INTERVAL_MS } from "./getDashboardStats"

export const REQUEST_LOGS_PAGE_SIZE = 20

export async function getRequestLogs(
  workspaceId: string,
  page: number,
  limit = REQUEST_LOGS_PAGE_SIZE
): Promise<RequestLogsResponse> {
  const { data } = await axiosInstance.get(`/${workspaceId}/dashboard/logs`, {
    params: { page, limit },
  })
  return data
}

export function useGetRequestLogs(workspaceId: string, page: number) {
  return useQuery<RequestLogsResponse, customAxiosError>({
    queryKey: dashboardKeys.logs(workspaceId, page),
    queryFn: () => getRequestLogs(workspaceId, page),
    refetchInterval: DASHBOARD_POLL_INTERVAL_MS,
    staleTime: DASHBOARD_POLL_INTERVAL_MS,
    placeholderData: keepPreviousData,
  })
}
