import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { axiosInstance, type customAxiosError } from "@/lib/axios"
import { mcpKeys } from "@/lib/queryKeys"

// 키는 멤버십 생성 시 자동 발급되어 활성 멤버라면 항상 존재한다.
// 멤버 각자가 자기 키만 조회하며, 남의 키를 읽을 경로는 없다.
export interface WorkspaceApiKey {
  apiKey: string
  issuedAt: string | null
}

export async function getWorkspaceApiKey(
  workspaceId: string
): Promise<WorkspaceApiKey> {
  const { data } = await axiosInstance.get<WorkspaceApiKey>(
    `/workspaces/${workspaceId}/api-key`
  )
  return data
}

export function useWorkspaceApiKey(workspaceId: string) {
  return useQuery<WorkspaceApiKey, customAxiosError>({
    queryKey: mcpKeys.apiKey(workspaceId),
    queryFn: () => getWorkspaceApiKey(workspaceId),
  })
}

// 재발급 — 본인 키만 교체된다
export async function reissueApiKey(
  workspaceId: string
): Promise<WorkspaceApiKey> {
  const { data } = await axiosInstance.post<WorkspaceApiKey>(
    `/workspaces/${workspaceId}/api-key`
  )
  return data
}

import { useApiErrorHandler } from "@/hooks/useApiErrorHandler"

// 성공 시 키 쿼리를 초기화해 새 키를 다시 조회한다
export function useReissueApiKey(workspaceId: string) {
  const queryClient = useQueryClient()
  const handleApiError = useApiErrorHandler()

  return useMutation<WorkspaceApiKey, customAxiosError, void>({
    mutationFn: () => reissueApiKey(workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: mcpKeys.apiKey(workspaceId),
      })
    },
    onError: (error) => handleApiError(error),
  })
}
