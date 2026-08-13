import { useMutation, useQueryClient } from "@tanstack/react-query"
import { axiosInstance, type customAxiosError } from "@/lib/axios"
import { browserKeys } from "@/lib/queryKeys"
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler"

export interface ResetMockStatePayload {
  itemId: string
}

export async function resetMockState(
  workspaceId: string,
  payload: ResetMockStatePayload
): Promise<{ success: true }> {
  const { data } = await axiosInstance.post(
    `/${workspaceId}/filebrowser/resetMockState`,
    payload
  )
  return data
}

export function useResetMockState(workspaceId: string) {
  const queryClient = useQueryClient()
  const handleApiError = useApiErrorHandler()

  return useMutation<{ success: true }, customAxiosError, ResetMockStatePayload>({
    mutationFn: (payload) => resetMockState(workspaceId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: browserKeys.all(workspaceId) })
      // SSE 이벤트가 도착하기 전에도 같은 탭에서는 즉시 반영되도록 함께 무효화한다
      queryClient.invalidateQueries({
        queryKey: ["workspaces", workspaceId, "mockState"],
      })
    },
    onError: (error) => handleApiError(error),
  })
}
