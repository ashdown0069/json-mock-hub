import { useMutation, useQueryClient } from "@tanstack/react-query"
import { axiosInstance, type customAxiosError } from "@/lib/axios"
import { useRouter } from "@/i18n/routing"
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler"

export async function logoutUser(): Promise<{ message: string }> {
  const { data } = await axiosInstance.post<{ message: string }>("/auth/logout")
  return data
}

export function useLogout() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const handleApiError = useApiErrorHandler()

  return useMutation<{ message: string }, customAxiosError, void>({
    mutationFn: logoutUser,
    onSuccess: () => {
      queryClient.clear()
      router.push("/")
    },
    onError: (error) => {
      handleApiError(error)
    },
  })
}
