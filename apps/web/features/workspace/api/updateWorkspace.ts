import { useMutation, useQueryClient } from "@tanstack/react-query"
import { axiosInstance, type customAxiosError } from "@/lib/axios"
import { workspaceKeys } from "@/lib/queryKeys"
import type { Workspace } from "./getWorkspaceList"

export interface UpdateWorkspaceRequest {
  name: string
}

export async function updateWorkspace(
  workspaceId: string,
  payload: UpdateWorkspaceRequest
): Promise<Workspace> {
  const { data } = await axiosInstance.patch<Workspace>(
    `/workspaces/${workspaceId}`,
    payload
  )
  return data
}

export function useUpdateWorkspace(workspaceId: string) {
  const queryClient = useQueryClient()
  return useMutation<Workspace, customAxiosError, UpdateWorkspaceRequest>({
    mutationFn: (payload) => updateWorkspace(workspaceId, payload),
    onSuccess: () => {
      // 상세·목록 캐시를 무효화해 변경된 이름을 반영한다
      queryClient.invalidateQueries({ queryKey: workspaceKeys.detail(workspaceId) })
      queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() })
    },
  })
}
