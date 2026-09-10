import React from "react"
import { renderHook } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useMockStateSSE } from "../useMockStateSSE"
import { mockStateKeys } from "@/lib/queryKeys"
import { useWorkspaceSSE, type WorkspaceSSEOptions } from "@/hooks/useWorkspaceSSE"

jest.mock("@/hooks/useWorkspaceSSE", () => ({
  useWorkspaceSSE: jest.fn(),
}))

const mockedUseWorkspaceSSE = jest.mocked(useWorkspaceSSE)

function latestOptions(): WorkspaceSSEOptions {
  const call = mockedUseWorkspaceSSE.mock.calls.at(-1)
  if (!call) throw new Error("useWorkspaceSSE가 호출되지 않았습니다")
  return call[0]
}

describe("useMockStateSSE 훅", () => {
  let queryClient: QueryClient
  let invalidateSpy: jest.SpyInstance

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  beforeEach(() => {
    jest.clearAllMocks()
    queryClient = new QueryClient()
    invalidateSpy = jest.spyOn(queryClient, "invalidateQueries")
  })

  it("mockstate 채널과 workspace를 공통 훅에 전달한다", () => {
    renderHook(() => useMockStateSSE("ws-1"), { wrapper })
    expect(latestOptions()).toMatchObject({
      workspaceId: "ws-1",
      channel: "mockstate",
    })
  })

  it("유효한 workspace와 path만 해당 effective Query를 무효화한다", () => {
    renderHook(() => useMockStateSSE("ws-1"), { wrapper })
    const options = latestOptions()
    options.onMessage({ workspaceId: "ws-1", path: "/users" })
    options.onMessage({ workspaceId: "other", path: "/users" })
    options.onMessage({ workspaceId: "ws-1" })
    expect(invalidateSpy).toHaveBeenCalledTimes(1)
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: mockStateKeys.effective("ws-1", "/users"),
    })
  })

  it("재동기화 요청은 workspace의 Mock Query 전체를 무효화한다", () => {
    renderHook(() => useMockStateSSE("ws-1"), { wrapper })
    latestOptions().onResync()
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["workspaces", "ws-1", "mockState"],
    })
  })
})
