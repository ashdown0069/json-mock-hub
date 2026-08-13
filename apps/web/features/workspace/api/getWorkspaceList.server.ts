import "server-only"
import { serverAxiosInstance } from "@/lib/serverAxios"
import { QueryClient } from "@tanstack/react-query"
import { workspaceKeys } from "@/lib/queryKeys"
import { mapWorkspace } from "./getWorkspaceList"
import type { Workspace } from "../types"

async function getWorkspaceListServer(): Promise<Workspace[]> {
  const response = await serverAxiosInstance.get<Workspace[]>("/workspaces")
  // 클라이언트 쿼리와 같은 캐시 키를 쓰므로 동일한 정규화를 거쳐야 한다.
  // (staleTime 30분 + refetchOnMount:false라 어긋나면 최대 30분간 잘못된 값이 남는다)
  return response.data.map(mapWorkspace)
}

export async function prefetchWorkspaceList(queryClient: QueryClient) {
  return queryClient.prefetchQuery({
    queryKey: workspaceKeys.lists(),
    queryFn: getWorkspaceListServer,
  })
}
