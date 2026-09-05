import { useMutation, useQueryClient } from "@tanstack/react-query"
import { axiosInstance, type customAxiosError } from "@/lib/axios"
import { browserKeys } from "@/lib/queryKeys"
import {
  FieldSchema,
  MockApiOptions,
  type CreatedItemResponse,
} from "@workspace/types"

import { useApiErrorHandler } from "@/hooks/useApiErrorHandler"

export interface CreateItemPayload {
  name: string
  itemType: "File" | "Folder"
  parentId: string | null
  schema?: Record<string, unknown>
  json?: unknown
  options?: MockApiOptions
  fieldDefs?: FieldSchema[]
}

// @Serialize(FilebrowserItems)가 적용되어 id와 path를 포함한 CreatedItemResponse를 반환한다.
export async function createBrowserItem(
  workspaceId: string,
  payload: CreateItemPayload
): Promise<CreatedItemResponse> {
  const { data } = await axiosInstance.post(`/${workspaceId}/filebrowser/createItem`, payload)
  return data
}

// defaultMsg는 호출부가 화면 문맥에 맞는 메시지를 넘기기 위한 것이다.
// 넘기지 않으면 useApiErrorHandler가 로케일별 generic 폴백을 쓴다.
export function useCreateBrowserItem(
  workspaceId: string,
  options?: { defaultMsg?: string }
) {
  const queryClient = useQueryClient()
  const handleApiError = useApiErrorHandler()

  return useMutation<CreatedItemResponse, customAxiosError, CreateItemPayload>({
    mutationFn: (payload: CreateItemPayload) => createBrowserItem(workspaceId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: browserKeys.all(workspaceId) })
    },
    onError: (error) => handleApiError(error, { defaultMsg: options?.defaultMsg }),
  })
}
