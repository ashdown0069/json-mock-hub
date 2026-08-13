jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}))

import React from "react"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { axiosInstance, type customAxiosError } from "@/lib/axios"
import { logIn, useLogIn } from "../logInUserService"
import { useSignup, type SignupRequest } from "../signupService"

// 로그인·회원가입 서비스는 모두 전역 설정(baseURL, withCredentials, 401 인터셉터)이 적용된
// axiosInstance를 사용하므로, 개별 요청 옵션이 아니라 이 인스턴스를 목킹한다.
jest.mock("@/lib/axios", () => ({
  axiosInstance: { post: jest.fn() },
}))

const mockAxiosInstancePost = axiosInstance.post as jest.Mock

const createWrapper = (queryClient: QueryClient) => {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe("인증 서비스", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("logIn", () => {
    it("axiosInstance로 /auth/login에 이메일·비밀번호를 전송하고 응답 데이터를 반환해야 한다", async () => {
      const authResponse = {
        accessToken: "token-123",
        user: { id: "u1", email: "test@example.com", nickname: "tester" },
      }
      mockAxiosInstancePost.mockResolvedValueOnce({ data: authResponse })

      const result = await logIn("test@example.com", "password123")

      // baseURL·withCredentials는 axiosInstance 전역 설정이 담당하므로 상대 경로만 검증한다.
      expect(mockAxiosInstancePost).toHaveBeenCalledWith("/auth/login", {
        email: "test@example.com",
        password: "password123",
      })
      expect(result).toEqual(authResponse)
    })
  })

  describe("useLogIn", () => {
    it("로그인 요청을 성공적으로 수행해야 한다", async () => {
      mockAxiosInstancePost.mockResolvedValueOnce({
        data: {
          accessToken: "token-123",
          user: { id: "u1", email: "test@example.com", nickname: "tester" },
        },
      })

      const queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
          },
        },
      })
      const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries")

      const { result } = renderHook(() => useLogIn(), {
        wrapper: createWrapper(queryClient),
      })

      result.current.mutate({ email: "test@example.com", password: "password123" })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockAxiosInstancePost).toHaveBeenCalledWith("/auth/login", {
        email: "test@example.com",
        password: "password123",
      })
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["auth"] })
    })

    it("useLogIn 훅은 로그인 실패 시 에러 상태를 반환해야 한다", async () => {
      const mockAxiosError = {
        isAxiosError: true,
        response: {
          status: 401,
          data: { message: "이메일 또는 비밀번호가 올바르지 않습니다." },
        },
      }
      mockAxiosInstancePost.mockRejectedValueOnce(mockAxiosError)

      const queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
          },
        },
      })
      const { result } = renderHook(() => useLogIn(), { wrapper: createWrapper(queryClient) })
      result.current.mutate({ email: "user@test.com", password: "wrong-password" })

      await waitFor(() => expect(result.current.isError).toBe(true))
      expect(result.current.error).toBeDefined()
      expect((result.current.error as customAxiosError).response?.status).toBe(401)
    })
  })

  describe("useSignup", () => {
    it("confirmPassword를 제외한 회원가입 페이로드를 전송해야 한다", async () => {
      mockAxiosInstancePost.mockResolvedValueOnce({ data: { success: true } })

      const queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
          },
        },
      })
      const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries")

      const { result } = renderHook(() => useSignup(), {
        wrapper: createWrapper(queryClient),
      })

      const signupPayload: SignupRequest = {
        email: "user@test.com",
        nickname: "tester",
        password: "123456",
      }

      result.current.mutate(signupPayload)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockAxiosInstancePost).toHaveBeenCalledWith("/auth/signup", {
        email: "user@test.com",
        nickname: "tester",
        password: "123456",
      })
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["auth"] })
    })

    it("useSignup 훅은 회원가입 실패 시 에러 상태를 반환해야 한다", async () => {
      const mockAxiosError = {
        isAxiosError: true,
        response: {
          status: 400,
          data: { message: "이미 가입된 이메일입니다." },
        },
      }
      mockAxiosInstancePost.mockRejectedValueOnce(mockAxiosError)

      const queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
          },
        },
      })
      const { result } = renderHook(() => useSignup(), { wrapper: createWrapper(queryClient) })
      const signupPayload: SignupRequest = {
        email: "user@test.com",
        nickname: "tester",
        password: "123",
      }
      result.current.mutate(signupPayload)

      await waitFor(() => expect(result.current.isError).toBe(true))
      expect(result.current.error).toBeDefined()
      expect((result.current.error as customAxiosError).response?.status).toBe(400)
    })
  })
})
