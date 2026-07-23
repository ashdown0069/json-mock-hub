import React from "react"
import { renderHook, waitFor, act } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import axiosInstance, { type customAxiosError } from "@/lib/axios"
import { useJoinWorkspace } from "../joinWorkspace"

jest.mock("@/lib/axios", () => {
  const instance = { post: jest.fn() }
  return { __esModule: true, default: instance, axiosInstance: instance }
})

const mockedAxiosInstance = axiosInstance as jest.Mocked<typeof axiosInstance>

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe("워크스페이스 가입 훅", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("비밀번호를 포함한 가입 요청을 올바른 엔드포인트로 전송하고 성공 응답 데이터를 반환해야 한다", async () => {
    const mockResponse = {
      success: true,
      message: "성공적으로 가입되었습니다.",
    }
    mockedAxiosInstance.post.mockResolvedValueOnce({ data: mockResponse })

    const { result, unmount } = renderHook(() => useJoinWorkspace("ws-1"), {
      wrapper: createWrapper(),
    })

    act(() => {
      result.current.mutate({ password: "my-password" })
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(mockResponse)
    expect(mockedAxiosInstance.post).toHaveBeenCalledWith(
      "/workspaces/ws-1/join",
      { password: "my-password" }
    )

    unmount()
  })

  it("API 요청 실패 시 에러 상태로 전이되고 이를 올바르게 처리해야 한다", async () => {
    const mockAxiosError = {
      isAxiosError: true,
      response: {
        status: 400,
        data: { message: "비밀번호가 일치하지 않습니다." },
      },
    }
    mockedAxiosInstance.post.mockRejectedValueOnce(mockAxiosError)

    const { result, unmount } = renderHook(() => useJoinWorkspace("ws-1"), {
      wrapper: createWrapper(),
    })

    act(() => {
      result.current.mutate({ password: "my-password" })
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
      expect((result.current.error as customAxiosError).response?.status).toBe(400)
    })

    expect(result.current.error).toBeDefined()

    unmount()
  })
})
