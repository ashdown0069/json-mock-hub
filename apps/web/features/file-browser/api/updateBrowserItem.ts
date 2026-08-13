import { useMutation, useQueryClient } from "@tanstack/react-query"
import { axiosInstance, type customAxiosError } from "@/lib/axios"
import { browserKeys } from "@/lib/queryKeys"
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler"
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

// defaultMsg는 호출부가 화면 문맥에 맞는 메시지를 넘기기 위한 것이다.
// 넘기지 않으면 useApiErrorHandler가 로케일별 generic 폴백을 쓴다.
export function useUpdateBrowserItem(
  workspaceId: string,
  options?: { defaultMsg?: string }
) {
  const queryClient = useQueryClient()
  const handleApiError = useApiErrorHandler()

  return useMutation<FileItem, customAxiosError, UpdateItemPayload>({
    mutationFn: (payload: UpdateItemPayload) => updateBrowserItem(workspaceId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: browserKeys.all(workspaceId) })
    },
    onError: (error) => handleApiError(error, { defaultMsg: options?.defaultMsg }),
  })
}
