import "server-only"
import { serverAxiosInstance } from "@/lib/serverAxios"
import { QueryClient } from "@tanstack/react-query"
import { workspaceKeys } from "@/lib/queryKeys"
import type { Workspace } from "./getWorkspaceList"

async function getWorkspaceListServer(): Promise<Workspace[]> {
  const response = await serverAxiosInstance.get<Workspace[]>("/workspaces")
  return response.data
}

export async function prefetchWorkspaceList(queryClient: QueryClient) {
  return queryClient.prefetchQuery({
    queryKey: workspaceKeys.lists(),
    queryFn: getWorkspaceListServer,
  })
}
