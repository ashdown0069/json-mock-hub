import "server-only"
import { QueryClient } from "@tanstack/react-query"
import { serverAxiosInstance } from "@/lib/serverAxios"
import { dashboardKeys } from "@/lib/queryKeys"
import { RequestLogsResponse } from "../types"
import { REQUEST_LOGS_PAGE_SIZE } from "./getRequestLogs"

export const getRequestLogsServer = async (
  workspaceId: string,
  page: number,
  limit = REQUEST_LOGS_PAGE_SIZE
): Promise<RequestLogsResponse> => {
  const { data } = await serverAxiosInstance.get(`/${workspaceId}/dashboard/logs`, {
    params: { page, limit },
  })
  return data
}

export const prefetchRequestLogs = async (
  queryClient: QueryClient,
  workspaceId: string,
  page = 1
) => {
  return queryClient.prefetchQuery({
    queryKey: dashboardKeys.logs(workspaceId, page),
    queryFn: () => getRequestLogsServer(workspaceId, page),
  })
}
