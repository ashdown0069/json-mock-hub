import React from "react"
import { renderHook, waitFor, act } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import axiosInstance from "@/lib/axios"
import { useWorkspaceApiKey, useReissueApiKey, reissueApiKey } from "../apiKey"

jest.mock("next-intl", () => ({
  useTranslations: () => {
    const t = (key: string) => key
    t.has = () => false
    return t
  },
}))

jest.mock("@/lib/axios", () => {
  const instance = {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  }
  return { __esModule: true, default: instance, axiosInstance: instance }
})

const mockedAxiosInstance = axiosInstance as jest.Mocked<typeof axiosInstance>

describe("MCP API 키 훅", () => {
  let queryClient: QueryClient
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  beforeEach(() => {
    jest.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
  })

  it("reissueApiKey 함수는 훅 없이도 재발급 요청을 서버로 전송해야 한다", async () => {
    const mockReissued = {
      apiKey: "mock_new_key",
      issuedAt: "2026-07-28T00:00:00Z",
    }
    mockedAxiosInstance.post.mockResolvedValueOnce({ data: mockReissued })

    const result = await reissueApiKey("ws-1")

    expect(mockedAxiosInstance.post).toHaveBeenCalledWith(
      "/workspaces/ws-1/api-key"
    )
    expect(result).toEqual(mockReissued)
  })

  it("내 API 키를 성공적으로 조회해야 한다", async () => {
    const mockApiKey = {
      apiKey: "mock_current_key",
      issuedAt: "2026-07-16T00:00:00Z",
    }
    mockedAxiosInstance.get.mockResolvedValueOnce({ data: mockApiKey })

    const { result } = renderHook(() => useWorkspaceApiKey("ws-1"), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockedAxiosInstance.get).toHaveBeenCalledWith(
      "/workspaces/ws-1/api-key"
    )
    expect(result.current.data).toEqual(mockApiKey)
  })

  it("재발급 성공 시 API 키 쿼리를 초기화해 설치 명령이 새 키로 갱신되게 한다", async () => {
    const mockReissued = {
      apiKey: "mock_new_key",
      issuedAt: "2026-07-28T00:00:00Z",
    }
    mockedAxiosInstance.post.mockResolvedValueOnce({ data: mockReissued })
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries")

    const { result } = renderHook(() => useReissueApiKey("ws-1"), { wrapper })

    act(() => {
      result.current.mutate()
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(invalidateSpy).toHaveBeenCalled()
  })
})
