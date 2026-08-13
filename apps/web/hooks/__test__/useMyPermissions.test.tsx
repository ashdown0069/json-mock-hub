import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { axiosInstance } from "@/lib/axios"
import { useMyPermissions } from "../useMyPermissions"

jest.mock("next-intl", () => ({
  useTranslations: () => {
    const t = (key: string) => key
    t.has = () => false
    return t
  },
}))

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe("useMyPermissions", () => {
  afterEach(() => jest.restoreAllMocks())

  it("workspaceId가 비어 있으면 요청하지 않는다", () => {
    const get = jest.spyOn(axiosInstance, "get")

    renderHook(() => useMyPermissions(""), { wrapper })

    expect(get).not.toHaveBeenCalled()
  })

  it("조회 실패를 isError로 노출한다 (권한 false와 구분되어야 함)", async () => {
    jest.spyOn(axiosInstance, "get").mockRejectedValue(new Error("500"))

    const { result } = renderHook(() => useMyPermissions("ws1"), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })

  it("조회 실패 시에도 권한 플래그는 false를 유지한다 (안전한 기본값)", async () => {
    jest.spyOn(axiosInstance, "get").mockRejectedValue(new Error("500"))

    const { result } = renderHook(() => useMyPermissions("ws1"), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.canDelete).toBe(false)
  })

  it("owner면 모든 권한이 true다", async () => {
    jest.spyOn(axiosInstance, "get").mockImplementation(async (url: string) => {
      if (url.endsWith("/membership")) {
        return { data: { isMember: true, role: "owner" } } as never
      }
      return { data: [] } as never
    })

    const { result } = renderHook(() => useMyPermissions("ws1"), { wrapper })

    await waitFor(() => expect(result.current.isOwner).toBe(true))
    expect(result.current.canDelete).toBe(true)
    expect(result.current.isError).toBe(false)
  })
})
