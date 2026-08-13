import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { axiosInstance, type customAxiosError } from "@/lib/axios"
import { workspaceSettingsKeys } from "@/lib/queryKeys"
import type { WorkspaceMember } from "../types"

export async function getMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  const { data } = await axiosInstance.get<WorkspaceMember[]>(
    `/workspaces/${workspaceId}/members`
  )
  return data
}

export function useMembers(workspaceId: string) {
  return useQuery<WorkspaceMember[], customAxiosError>({
    queryKey: workspaceSettingsKeys.members(workspaceId),
    queryFn: () => getMembers(workspaceId),
  })
}

export async function removeMember(workspaceId: string, userId: string) {
  const { data } = await axiosInstance.delete(
    `/workspaces/${workspaceId}/members/${userId}`
  )
  return data
}

import { useApiErrorHandler } from "@/hooks/useApiErrorHandler"

export function useRemoveMember(workspaceId: string) {
  const queryClient = useQueryClient()
  const handleApiError = useApiErrorHandler()

  return useMutation<unknown, customAxiosError, { userId: string }>({
    mutationFn: ({ userId }) => removeMember(workspaceId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceSettingsKeys.members(workspaceId) })
    },
    onError: (error) => handleApiError(error),
  })
}
