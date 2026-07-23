import { useMutation, useQueryClient } from "@tanstack/react-query"
import { axiosInstance, type customAxiosError } from "@/lib/axios"
import { browserKeys } from "@/lib/queryKeys"
import { FileItem } from "../types"

export interface MoveItemsPayload {
  dragIds: string[]
  parentId: string | null
}

export async function moveBrowserItems(
  workspaceId: string,
  payload: MoveItemsPayload
): Promise<FileItem[]> {
  const { data } = await axiosInstance.patch(`/${workspaceId}/filebrowser/moveItems`, {
    dragIds: payload.dragIds,
    parentId: payload.parentId,
  })
  return data
}

export function useMoveBrowserItems(workspaceId: string) {
  const queryClient = useQueryClient()
  return useMutation<FileItem[], customAxiosError, MoveItemsPayload>({
    mutationFn: (payload: MoveItemsPayload) => moveBrowserItems(workspaceId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: browserKeys.all(workspaceId) })
    },
  })
}
