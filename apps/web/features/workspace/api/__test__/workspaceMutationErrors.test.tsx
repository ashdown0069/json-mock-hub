jest.mock("next-intl", () => ({
  useTranslations: () => {
    const t = (key: string) => key
    t.has = () => false
    return t
  },
}))

jest.mock("sonner", () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}))

jest.mock("@/lib/axios", () => {
  const instance = {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    put: jest.fn(),
  }
  return { __esModule: true, default: instance, axiosInstance: instance }
})

import React from "react"
import { renderHook, waitFor, act } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { toast } from "sonner"
import { axiosInstance } from "@/lib/axios"
import { useCreateWorkspace } from "../createWorkspace"
import { useUpdateWorkspace } from "../updateWorkspace"
import { useJoinWorkspace } from "../joinWorkspace"

const mockedAxios = axiosInstance as jest.Mocked<typeof axiosInstance>
const mockedToastError = toast.error as jest.Mock

describe("워크스페이스 mutation 에러 처리", () => {
  let queryClient: QueryClient

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    jest.clearAllMocks()
  })

  it("useCreateWorkspace 실패 시 토스트가 한 번 뜬다", async () => {
    mockedAxios.post.mockRejectedValueOnce({ response: { status: 500, data: {} } })

    const { result } = renderHook(() => useCreateWorkspace(), { wrapper })

    act(() => {
      result.current.mutate({ name: "shop", description: "설명" })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(mockedToastError).toHaveBeenCalledTimes(1)
  })

  it("useCreateWorkspace는 defaultMsg를 받으면 그 메시지를 쓴다", async () => {
    mockedAxios.post.mockRejectedValueOnce({ response: { status: 500, data: {} } })

    const { result } = renderHook(
      () => useCreateWorkspace({ defaultMsg: "생성에 실패했습니다" }),
      { wrapper }
    )

    act(() => {
      result.current.mutate({ name: "shop", description: "설명" })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(mockedToastError).toHaveBeenCalledWith(
      "생성에 실패했습니다",
      expect.anything()
    )
  })

  it("useUpdateWorkspace 실패 시 토스트가 한 번 뜬다", async () => {
    mockedAxios.patch.mockRejectedValueOnce({ response: { status: 403, data: {} } })

    const { result } = renderHook(() => useUpdateWorkspace("ws1"), { wrapper })

    act(() => {
      result.current.mutate({ name: "새이름" })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(mockedToastError).toHaveBeenCalledTimes(1)
  })

  it("useJoinWorkspace는 훅에서 토스트를 띄우지 않는다 — 호출부가 폼 필드 에러로 표시한다", async () => {
    mockedAxios.post.mockRejectedValueOnce({
      response: { status: 400, data: { code: "workspace.join.password_mismatch" } },
    })

    const { result } = renderHook(() => useJoinWorkspace("ws1"), { wrapper })

    act(() => {
      result.current.mutate({ password: "틀린비밀번호" })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(mockedToastError).not.toHaveBeenCalled()
  })
})
