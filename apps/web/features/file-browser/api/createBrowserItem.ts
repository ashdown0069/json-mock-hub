import { useMutation, useQueryClient } from "@tanstack/react-query"
import { axiosInstance, type customAxiosError } from "@/lib/axios"
import { browserKeys } from "@/lib/queryKeys"
import { FileItem } from "../types"
import { FieldSchema, MockApiOptions } from "@/types/schema"

export interface CreateItemPayload {
  name: string
  itemType: "File" | "Folder"
  parentId: string | null
  schema?: Record<string, unknown>
  json?: unknown
  options?: MockApiOptions
  fieldDefs?: FieldSchema[]
}

export async function createBrowserItem(
  workspaceId: string,
  payload: CreateItemPayload
): Promise<FileItem> {
  const { data } = await axiosInstance.post(`/${workspaceId}/filebrowser/createItem`, payload)
  return data
}

export function useCreateBrowserItem(workspaceId: string) {
  const queryClient = useQueryClient()
  return useMutation<FileItem, customAxiosError, CreateItemPayload>({
    mutationFn: (payload: CreateItemPayload) => createBrowserItem(workspaceId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: browserKeys.all(workspaceId) })
    },
  })
}
