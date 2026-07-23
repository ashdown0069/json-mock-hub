import { useMutation, useQueryClient } from "@tanstack/react-query"
import { axiosInstance, type customAxiosError } from "@/lib/axios"
import { authKeys } from "@/lib/queryKeys"

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
  return useMutation<AuthResponse, customAxiosError, { email: string; password: string }>({
    mutationFn: (params: { email: string; password: string }) =>
      logIn(params.email, params.password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.user() })
    },
  })
}
