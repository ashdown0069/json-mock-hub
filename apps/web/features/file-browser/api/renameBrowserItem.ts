import { useMutation, useQueryClient } from "@tanstack/react-query"
import { axiosInstance, type customAxiosError } from "@/lib/axios"
import { browserKeys } from "@/lib/queryKeys"
import { FileItem } from "../types"

import { useApiErrorHandler } from "@/hooks/useApiErrorHandler"

export interface RenameItemPayload {
  itemId: string
  newName: string
}

export async function renameBrowserItem(
  workspaceId: string,
  payload: RenameItemPayload
): Promise<FileItem> {
  const { data } = await axiosInstance.patch(`/${workspaceId}/filebrowser/renameItem`, {
    itemId: payload.itemId,
    newName: payload.newName,
  })
  return data
}

export function useRenameBrowserItem(workspaceId: string) {
  const queryClient = useQueryClient()
  const handleApiError = useApiErrorHandler()

  return useMutation<FileItem, customAxiosError, RenameItemPayload>({
    mutationFn: (payload: RenameItemPayload) => renameBrowserItem(workspaceId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: browserKeys.all(workspaceId) })
    },
    onError: (error) => handleApiError(error),
  })
}

