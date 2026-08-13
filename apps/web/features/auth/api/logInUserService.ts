import { useMutation, useQueryClient } from "@tanstack/react-query"
import { axiosInstance, type customAxiosError } from "@/lib/axios"
import { authKeys } from "@/lib/queryKeys"

import { useApiErrorHandler } from "@/hooks/useApiErrorHandler"

export interface AuthResponse {
  accessToken: string
  user: {
    id: string
    email: string
    nickname: string
  }
}

export async function logIn(email: string, password: string): Promise<AuthResponse> {
  const { data } = await axiosInstance.post<AuthResponse>("/auth/login", {
    email,
    password,
  })

  return data
}

export function useLogIn() {
  const queryClient = useQueryClient()
  const handleApiError = useApiErrorHandler()

  return useMutation<AuthResponse, customAxiosError, { email: string; password: string }>({
    mutationFn: (params: { email: string; password: string }) =>
      logIn(params.email, params.password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.all })
    },
    // 전역 폴백은 API의 raw message(하드코딩 한국어)를 그대로 노출해
    // /en 사용자가 한국어 오류를 본다. 로케일별 번역으로 처리한다.
    onError: (error) => handleApiError(error),
  })
}

