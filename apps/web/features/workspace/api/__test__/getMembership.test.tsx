import React from "react"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { axiosInstance } from "@/lib/axios"
import { getMembership, useMembership } from "../getMembership"

jest.mock("@/lib/axios", () => {
  const instance = { get: jest.fn() }
  return { __esModule: true, default: instance, axiosInstance: instance }
})

const mockedAxios = axiosInstance as jest.Mocked<typeof axiosInstance>

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe("getMembership / useMembership", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("getMembership은 멤버십 엔드포인트로 GET 요청을 보내고 응답을 그대로 반환한다", async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { isMember: true, role: "owner" },
    })

    const result = await getMembership("ws-1")

    expect(mockedAxios.get).toHaveBeenCalledWith("/workspaces/ws-1/membership")
    expect(result).toEqual({ isMember: true, role: "owner" })
  })

  it("useMembership은 workspaceId가 비어 있으면 요청하지 않는다", () => {
    renderHook(() => useMembership(""), { wrapper })

    expect(mockedAxios.get).not.toHaveBeenCalled()
  })

  it("useMembership은 비멤버 응답도 그대로 노출한다", async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { isMember: false, role: null },
    })

    const { result } = renderHook(() => useMembership("ws-1"), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ isMember: false, role: null })
  })
})
