import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { toast } from "sonner"
import type { ReactNode } from "react"
import { axiosInstance } from "@/lib/axios"
import { useCreateBrowserItem } from "../createBrowserItem"
import { useRenameBrowserItem } from "../renameBrowserItem"
import { useMoveBrowserItems } from "../moveBrowserItems"
import { useDeleteBrowserItems } from "../deleteBrowserItems"
import { useUpdateBrowserItem } from "../updateBrowserItem"

jest.mock("next-intl", () => ({
  useTranslations: () => {
    const t = (key: string) => key
    t.has = (key: string) => key === "duplicate" || key === "requestFailed"
    return t
  },
}))

jest.mock("sonner", () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}))

const WS = "ws1"

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  })
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

/** axios가 던지는 형태의 에러를 만든다 */
const apiError = (status: number, code: string) =>
  Object.assign(new Error("request failed"), {
    isAxiosError: true,
    response: { status, data: { statusCode: status, code, message: "err" } },
  })

describe("파일 트리 mutation의 에러 토스트", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("생성 실패(중복 이름)에 매핑된 메시지를 토스트한다", async () => {
    jest.spyOn(axiosInstance, "post").mockRejectedValue(apiError(400, "duplicate"))

    const { result } = renderHook(() => useCreateBrowserItem(WS), { wrapper })
    result.current.mutate({ name: "shop", itemType: "Folder", parentId: null })

    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect(toast.error).toHaveBeenCalledWith("duplicate", expect.anything())
  })

  it("이름 변경 실패를 토스트한다", async () => {
    jest.spyOn(axiosInstance, "patch").mockRejectedValue(apiError(400, "duplicate"))

    const { result } = renderHook(() => useRenameBrowserItem(WS), { wrapper })
    result.current.mutate({ itemId: "1", newName: "shop" })

    await waitFor(() => expect(toast.error).toHaveBeenCalled())
  })

  it("이동 실패(권한 없음)를 토스트한다", async () => {
    jest
      .spyOn(axiosInstance, "patch")
      .mockRejectedValue(apiError(403, "workspace.permission.denied"))

    const { result } = renderHook(() => useMoveBrowserItems(WS), { wrapper })
    result.current.mutate({ dragIds: ["1"], parentId: null })

    await waitFor(() => expect(toast.error).toHaveBeenCalled())
  })

  it("삭제 실패(권한 없음)를 토스트한다", async () => {
    jest
      .spyOn(axiosInstance, "delete")
      .mockRejectedValue(apiError(403, "workspace.permission.denied"))

    const { result } = renderHook(() => useDeleteBrowserItems(WS), { wrapper })
    result.current.mutate(["1"])

    await waitFor(() => expect(toast.error).toHaveBeenCalled())
  })

  it("Mock API 수정 실패(권한 없음)를 토스트한다", async () => {
    jest
      .spyOn(axiosInstance, "put")
      .mockRejectedValue(apiError(403, "workspace.permission.denied"))

    const { result } = renderHook(() => useUpdateBrowserItem(WS), { wrapper })
    result.current.mutate({
      itemId: "1",
      name: "users",
      itemType: "File",
      parentId: null,
    })

    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect(toast.error).toHaveBeenCalledWith("requestFailed", expect.anything())
  })

  it("매핑되지 않은 코드는 generic 폴백 메시지를 쓴다", async () => {
    jest
      .spyOn(axiosInstance, "post")
      .mockRejectedValue(apiError(500, "common.internal_error"))

    const { result } = renderHook(() => useCreateBrowserItem(WS), { wrapper })
    result.current.mutate({ name: "shop", itemType: "Folder", parentId: null })

    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect(toast.error).toHaveBeenCalledWith("requestFailed", expect.anything())
  })
})
