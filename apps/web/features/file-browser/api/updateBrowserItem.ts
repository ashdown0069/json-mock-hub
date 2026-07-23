import { useMutation, useQueryClient } from "@tanstack/react-query"
import { axiosInstance, type customAxiosError } from "@/lib/axios"
import { browserKeys } from "@/lib/queryKeys"
import { FileItem } from "../types"
import { CreateItemPayload } from "./createBrowserItem"

export interface UpdateItemPayload extends CreateItemPayload {
  itemId: string
}

export async function updateBrowserItem(
  workspaceId: string,
  payload: UpdateItemPayload
): Promise<FileItem> {
  const { data } = await axiosInstance.put(`/${workspaceId}/filebrowser`, payload)
  return data
}

export function useUpdateBrowserItem(workspaceId: string) {
  const queryClient = useQueryClient()
  return useMutation<FileItem, customAxiosError, UpdateItemPayload>({
    mutationFn: (payload: UpdateItemPayload) => updateBrowserItem(workspaceId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: browserKeys.all(workspaceId) })
    },
  })
}
