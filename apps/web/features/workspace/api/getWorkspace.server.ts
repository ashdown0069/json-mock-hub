import "server-only"
import { QueryClient } from "@tanstack/react-query"
import { serverAxiosInstance } from "@/lib/serverAxios"
import { workspaceKeys } from "@/lib/queryKeys"
import type { Workspace } from "./getWorkspaceList"

export async function getWorkspaceServer(workspaceId: string): Promise<Workspace> {
  const { data } = await serverAxiosInstance.get<Workspace>(`/workspaces/${workspaceId}`)
  return data
}

export async function prefetchWorkspace(queryClient: QueryClient, workspaceId: string) {
  return queryClient.prefetchQuery({
    queryKey: workspaceKeys.detail(workspaceId),
    queryFn: () => getWorkspaceServer(workspaceId),
  })
}
