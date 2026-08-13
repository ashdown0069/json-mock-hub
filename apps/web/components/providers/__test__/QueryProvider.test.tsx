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
import { QueryClientProvider } from "@tanstack/react-query"
import { toast } from "sonner"
import { axiosInstance } from "@/lib/axios"
import { makeQueryClient } from "../QueryProvider"
import { useCreateBrowserItem } from "@/features/file-browser/api/createBrowserItem"

const mockedAxios = axiosInstance as jest.Mocked<typeof axiosInstance>
const mockedToastError = toast.error as jest.Mock

describe("QueryProvider 전역 mutation 에러 처리", () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={makeQueryClient()}>{children}</QueryClientProvider>
  )

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("훅이 onError를 정의한 mutation 실패 시 토스트가 정확히 한 번만 뜬다", async () => {
    // 전역 mutationCache.onError는 개별 onError 유무와 무관하게 항상 실행되므로,
    // 전역 폴백이 남아 있으면 이 케이스에서 토스트가 2번 뜬다.
    mockedAxios.post.mockRejectedValueOnce({
      response: { status: 400, data: { code: "duplicate" } },
    })

    const { result } = renderHook(() => useCreateBrowserItem("ws1"), { wrapper })

    act(() => {
      result.current.mutate({ name: "중복이름", itemType: "Folder", parentId: null })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(mockedToastError).toHaveBeenCalledTimes(1)
  })

  it("전역 폴백이 하드코딩 한국어 문자열을 띄우지 않는다", async () => {
    // 로케일 무시 방지: 사용자에게 보이는 문자열은 useApiErrorHandler(next-intl)만 만든다.
    mockedAxios.post.mockRejectedValueOnce({
      response: { status: 500, data: {} },
    })

    const { result } = renderHook(() => useCreateBrowserItem("ws1"), { wrapper })

    act(() => {
      result.current.mutate({ name: "폴더", itemType: "Folder", parentId: null })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    const messages = mockedToastError.mock.calls.map((call) => call[0])
    expect(messages).not.toContain(
      "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요."
    )
  })
})
