import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { axiosInstance, type customAxiosError } from "@/lib/axios"
import { workspaceSettingsKeys } from "@/lib/queryKeys"

// 키는 워크스페이스 생성 시 자동 발급되어 항상 존재한다 (키 없는 상태 없음)
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
    queryKey: workspaceSettingsKeys.apiKey(workspaceId),
    queryFn: () => getWorkspaceApiKey(workspaceId),
  })
}

// 재발급 (owner 전용) — 성공 시 키 쿼리를 초기화해 새 키를 다시 조회한다
export function useReissueApiKey(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation<WorkspaceApiKey, customAxiosError, void>({
    mutationFn: async () => {
      const { data } = await axiosInstance.post<WorkspaceApiKey>(
        `/workspaces/${workspaceId}/api-key`
      )
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: workspaceSettingsKeys.apiKey(workspaceId),
      })
    },
  })
}
