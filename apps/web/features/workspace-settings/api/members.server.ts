import "server-only"
import { QueryClient } from "@tanstack/react-query"
import { serverAxiosInstance } from "@/lib/serverAxios"
import { workspaceSettingsKeys } from "@/lib/queryKeys"
import type { WorkspaceMember } from "./members"

async function getMembersServer(workspaceId: string): Promise<WorkspaceMember[]> {
  const response = await serverAxiosInstance.get<WorkspaceMember[]>(
    `/workspaces/${workspaceId}/members`
  )
  return response.data
}

export async function prefetchMembers(queryClient: QueryClient, workspaceId: string) {
  return queryClient.prefetchQuery({
    queryKey: workspaceSettingsKeys.members(workspaceId),
    queryFn: () => getMembersServer(workspaceId),
  })
}
