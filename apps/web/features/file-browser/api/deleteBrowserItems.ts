import { useMutation, useQueryClient } from "@tanstack/react-query"
import { axiosInstance, type customAxiosError } from "@/lib/axios"
import { browserKeys } from "@/lib/queryKeys"

import { useApiErrorHandler } from "@/hooks/useApiErrorHandler"

export async function deleteBrowserItems(
  workspaceId: string,
  itemIds: string[]
): Promise<void> {
  await axiosInstance.delete(`/${workspaceId}/filebrowser`, {
    data: { itemIds },
  })
}

export function useDeleteBrowserItems(workspaceId: string) {
  const queryClient = useQueryClient()
  const handleApiError = useApiErrorHandler()

  return useMutation<void, customAxiosError, string[]>({
    mutationFn: (itemIds: string[]) => deleteBrowserItems(workspaceId, itemIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: browserKeys.all(workspaceId) })
    },
    onError: (error) => handleApiError(error),
  })
}

