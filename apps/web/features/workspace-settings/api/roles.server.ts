import "server-only"
import { QueryClient } from "@tanstack/react-query"
import { serverAxiosInstance } from "@/lib/serverAxios"
import { workspaceSettingsKeys } from "@/lib/queryKeys"
import type { WorkspaceRoleData } from "./roles"

async function getRolesServer(workspaceId: string): Promise<WorkspaceRoleData[]> {
  const response = await serverAxiosInstance.get<WorkspaceRoleData[]>(
    `/workspaces/${workspaceId}/roles`
  )
  return response.data
}

export async function prefetchRoles(queryClient: QueryClient, workspaceId: string) {
  return queryClient.prefetchQuery({
    queryKey: workspaceSettingsKeys.roles(workspaceId),
    queryFn: () => getRolesServer(workspaceId),
  })
}
