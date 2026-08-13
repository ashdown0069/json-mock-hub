import { axiosInstance, type customAxiosError } from "@/lib/axios"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { AuthResponse } from "./logInUserService"
import { authKeys } from "@/lib/queryKeys"

import { useApiErrorHandler } from "@/hooks/useApiErrorHandler"

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

import { useTranslations } from "next-intl"

export function useSignup() {
  const queryClient = useQueryClient()
  const handleApiError = useApiErrorHandler()
  const t = useTranslations("errors")

  return useMutation<AuthResponse, customAxiosError, SignupRequest>({
    mutationFn: (params: SignupRequest) => signupUser(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.all })
    },
    onError: (error) => handleApiError(error, { defaultMsg: t("signupFailed") }),
  })
}

