import React from "react"
import { renderHook } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useFileBrowserSSE } from "../useFileBrowserSSE"
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

describe("useFileBrowserSSE 훅", () => {
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

  it("filebrowser 채널과 workspace를 공통 훅에 전달한다", () => {
    renderHook(() => useFileBrowserSSE("ws-1"), { wrapper })
    expect(latestOptions()).toMatchObject({
      workspaceId: "ws-1",
      channel: "filebrowser",
    })
  })

  it("허용된 파일 변경만 목록 Query를 무효화한다", () => {
    renderHook(() => useFileBrowserSSE("ws-1"), { wrapper })
    const options = latestOptions()
    options.onMessage({ workspaceId: "ws-1", action: "CREATE" })
    options.onMessage({ workspaceId: "other", action: "CREATE" })
    options.onMessage({ workspaceId: "ws-1", action: "UNKNOWN" })
    expect(invalidateSpy).toHaveBeenCalledTimes(1)
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["workspaces", "ws-1", "browser"],
    })
  })

  it("재동기화 요청은 파일 목록 전체를 무효화한다", () => {
    renderHook(() => useFileBrowserSSE("ws-1"), { wrapper })
    latestOptions().onResync()
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["workspaces", "ws-1", "browser"],
    })
  })
})
