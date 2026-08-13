import { useMutation, useQueryClient } from "@tanstack/react-query"
import { axiosInstance, type customAxiosError } from "@/lib/axios"
import { workspaceKeys } from "@/lib/queryKeys"

export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}

export interface CreateWorkspaceRequest {
  name: string
  description: string
  password?: string
  passwordConfirm?: string
}

interface WorkspaceResponse {
  id: string
  name: string
  description: string
  createdAt: string
}

export async function createWorkspace(
  data: CreateWorkspaceRequest
): Promise<ApiResponse<WorkspaceResponse>> {
  const { data: resData } = await axiosInstance.post<ApiResponse<WorkspaceResponse>>(
    "/workspaces",
    data
  )
  return resData
}

import { useApiErrorHandler } from "@/hooks/useApiErrorHandler"

// defaultMsg는 호출부가 화면 문맥에 맞는 메시지를 넘기기 위한 것이다.
// 넘기지 않으면 useApiErrorHandler가 로케일별 generic 폴백을 쓴다.
export function useCreateWorkspace(options?: { defaultMsg?: string }) {
  const queryClient = useQueryClient()
  const handleApiError = useApiErrorHandler()

  return useMutation<
    ApiResponse<WorkspaceResponse>,
    customAxiosError,
    CreateWorkspaceRequest
  >({
    mutationFn: createWorkspace,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() })
    },
    onError: (error) => handleApiError(error, { defaultMsg: options?.defaultMsg }),
  })
}
