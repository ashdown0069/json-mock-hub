jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}))

import React from "react"
import { renderHook, act } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useLogout, logoutUser } from "../logoutService"
import { axiosInstance } from "@/lib/axios"

jest.mock("@/lib/axios", () => ({
  axiosInstance: {
    post: jest.fn(),
  },
}))

const mockPush = jest.fn()
jest.mock("@/i18n/routing", () => ({
  useRouter: () => ({ push: mockPush }),
}))

describe("logoutService", () => {
  let queryClient: QueryClient

  beforeEach(() => {
    jest.clearAllMocks()
    queryClient = new QueryClient()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  it("logoutUser는 /auth/logout 엔드포인트로 POST 요청을 보낸다", async () => {
    ;(axiosInstance.post as jest.Mock).mockResolvedValueOnce({
      data: { message: "Logged out successfully" },
    })
    const res = await logoutUser()
    expect(axiosInstance.post).toHaveBeenCalledWith("/auth/logout")
    expect(res.message).toBe("Logged out successfully")
  })

  it("useLogout 성공 시 queryClient 캐시를 클리어하고 홈(/)으로 이동한다", async () => {
    ;(axiosInstance.post as jest.Mock).mockResolvedValueOnce({
      data: { message: "Logged out successfully" },
    })
    const clearSpy = jest.spyOn(queryClient, "clear")

    const { result } = renderHook(() => useLogout(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync()
    })

    expect(clearSpy).toHaveBeenCalledTimes(1)
    expect(mockPush).toHaveBeenCalledWith("/")
  })
})
