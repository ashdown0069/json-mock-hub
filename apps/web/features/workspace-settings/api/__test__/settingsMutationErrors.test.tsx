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
import { useRemoveMember } from "../members"
import { useUpdateRole } from "../roles"

const mockedAxios = axiosInstance as jest.Mocked<typeof axiosInstance>
const mockedToastError = toast.error as jest.Mock

describe("워크스페이스 설정 mutation 에러 처리", () => {
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

  it("useRemoveMember 실패 시 토스트가 한 번 뜬다", async () => {
    mockedAxios.delete.mockRejectedValueOnce({
      response: { status: 400, data: { code: "workspace.member.cannot_remove_owner" } },
    })

    const { result } = renderHook(() => useRemoveMember("ws1"), { wrapper })

    act(() => {
      result.current.mutate({ userId: "user1" })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(mockedToastError).toHaveBeenCalledTimes(1)
  })

  it("useUpdateRole 실패 시 토스트가 한 번 뜬다", async () => {
    mockedAxios.patch.mockRejectedValueOnce({
      response: { status: 403, data: { code: "workspace.access.owner_only" } },
    })

    const { result } = renderHook(() => useUpdateRole("ws1"), { wrapper })

    act(() => {
      result.current.mutate({ roleId: "role1", permissions: { canDelete: false } })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(mockedToastError).toHaveBeenCalledTimes(1)
  })
})
