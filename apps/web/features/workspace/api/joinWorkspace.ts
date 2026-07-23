import { useMutation, useQueryClient } from "@tanstack/react-query"
import { axiosInstance, type customAxiosError } from "@/lib/axios"
import { workspaceKeys } from "@/lib/queryKeys"

export interface JoinWorkspaceResult {
  message: string
  workspace: {
    id: string
    name: string
  }
}

export interface JoinWorkspacePayload {
  password?: string
}

export async function joinWorkspace(
  workspaceId: string,
  payload?: JoinWorkspacePayload
): Promise<JoinWorkspaceResult> {
  const { data } = await axiosInstance.post<JoinWorkspaceResult>(
    `/workspaces/${workspaceId}/join`,
    payload
  )
  return data
}

export function useJoinWorkspace(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation<JoinWorkspaceResult, customAxiosError, JoinWorkspacePayload | undefined>({
    mutationFn: (payload) => joinWorkspace(workspaceId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() })
    },
  })
}
