import { axiosInstance, type customAxiosError } from "@/lib/axios"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { AuthResponse } from "./logInUserService"
import { authKeys } from "@/lib/queryKeys"

export interface SignupRequest {
  email: string
  nickname: string
  password: string
}

async function signupUser(data: SignupRequest): Promise<AuthResponse> {
  const { data: resData } = await axiosInstance.post("/auth/signup", {
    email: data.email,
    nickname: data.nickname,
    password: data.password,
  })
  return resData
}

export function useSignup() {
  const queryClient = useQueryClient()
  return useMutation<AuthResponse, customAxiosError, SignupRequest>({
    mutationFn: (params: SignupRequest) => signupUser(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.user() })
    },
  })
}
