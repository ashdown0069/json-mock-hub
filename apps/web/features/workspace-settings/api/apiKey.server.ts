import "server-only"
import { QueryClient } from "@tanstack/react-query"
import { serverAxiosInstance } from "@/lib/serverAxios"
import { workspaceSettingsKeys } from "@/lib/queryKeys"
import type { WorkspaceApiKey } from "./apiKey"

// /mcp 페이지 서버 컴포넌트에서 직접 사용한다 (멤버 권한 검증은 API 가드가 수행)
export async function getWorkspaceApiKeyServer(
  workspaceId: string
): Promise<WorkspaceApiKey> {
  const response = await serverAxiosInstance.get<WorkspaceApiKey>(
    `/workspaces/${workspaceId}/api-key`
  )
  return response.data
}

export async function prefetchWorkspaceApiKey(
  queryClient: QueryClient,
  workspaceId: string
) {
  return queryClient.prefetchQuery({
    queryKey: workspaceSettingsKeys.apiKey(workspaceId),
    queryFn: () => getWorkspaceApiKeyServer(workspaceId),
  })
}
