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

export function useCreateWorkspace() {
  const queryClient = useQueryClient()

  return useMutation<
    ApiResponse<WorkspaceResponse>,
    customAxiosError,
    CreateWorkspaceRequest
  >({
    mutationFn: createWorkspace,
    onSuccess: () => {
      // 생성 완료 후 워크스페이스 목록 쿼리를 무효화하여 화면을 갱신합니다.
      queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() })
    },
  })
}
