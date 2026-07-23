import React from "react"
import { renderHook, act } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useFileBrowserSSE } from "../useFileBrowserSSE"
import { refreshAccessToken } from "@/lib/axios"

jest.mock("@/lib/axios", () => ({
  refreshAccessToken: jest.fn().mockResolvedValue(undefined),
}))

const mockedRefresh = refreshAccessToken as jest.Mock

// jsdom에는 EventSource가 없으므로 테스트용 mock 구현
class MockEventSource {
  static readonly CONNECTING = 0
  static readonly OPEN = 1
  static readonly CLOSED = 2
  static instances: MockEventSource[] = []

  url: string
  withCredentials: boolean
  readyState: number = MockEventSource.CONNECTING
  onopen: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onerror: (() => void) | null = null
  close = jest.fn(() => {
    this.readyState = MockEventSource.CLOSED
  })

  constructor(url: string, init?: { withCredentials?: boolean }) {
    this.url = url
    this.withCredentials = init?.withCredentials ?? false
    MockEventSource.instances.push(this)
  }

  emitOpen() {
    this.readyState = MockEventSource.OPEN
    this.onopen?.()
  }

  emitMessage(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) })
  }

  // HTTP 거절(401 등)로 브라우저가 재연결을 포기한 상황 재현
  emitFatalError() {
    this.readyState = MockEventSource.CLOSED
    this.onerror?.()
  }
}

// noUncheckedIndexedAccess 대응: 인덱스 접근을 안전하게 감싸는 헬퍼
const getInstance = (index: number): MockEventSource => {
  const instance = MockEventSource.instances[index]
  if (!instance) {
    throw new Error(`EventSource 인스턴스 ${index}번이 생성되지 않았습니다`)
  }
  return instance
}

describe("useFileBrowserSSE 훅", () => {
  let queryClient: QueryClient
  let invalidateSpy: jest.SpyInstance

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  beforeEach(() => {
    jest.clearAllMocks()
    MockEventSource.instances = []
    ;(global as any).EventSource = MockEventSource
    queryClient = new QueryClient()
    invalidateSpy = jest.spyOn(queryClient, "invalidateQueries")
  })

  it("workspaceId 기반 URL로 쿠키를 포함해 연결한다", () => {
    renderHook(() => useFileBrowserSSE("ws-1"), { wrapper })

    expect(MockEventSource.instances).toHaveLength(1)
    expect(getInstance(0).url).toContain("/ws-1/filebrowser/subscribe")
    expect(getInstance(0).withCredentials).toBe(true)
  })

  it("자신의 워크스페이스 이벤트 수신 시 브라우저 쿼리를 무효화한다", () => {
    renderHook(() => useFileBrowserSSE("ws-1"), { wrapper })
    const es = getInstance(0)

    act(() => {
      es.emitOpen()
      es.emitMessage({ workspaceId: "ws-1", action: "CREATE" })
    })

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["workspaces", "ws-1", "browser"],
    })
  })

  it("다른 워크스페이스 이벤트는 무시한다", () => {
    renderHook(() => useFileBrowserSSE("ws-1"), { wrapper })
    const es = getInstance(0)

    act(() => {
      es.emitOpen()
      es.emitMessage({ workspaceId: "other-ws", action: "CREATE" })
    })

    expect(invalidateSpy).not.toHaveBeenCalled()
  })

  it("최초 연결(onopen)에서는 쿼리를 무효화하지 않는다", () => {
    renderHook(() => useFileBrowserSSE("ws-1"), { wrapper })

    act(() => {
      getInstance(0).emitOpen()
    })

    expect(invalidateSpy).not.toHaveBeenCalled()
  })

  it("치명적 에러 후 토큰을 갱신하고 재연결하며, 재연결 성공 시 보상 무효화를 수행한다", async () => {
    jest.useFakeTimers()
    try {
      renderHook(() => useFileBrowserSSE("ws-1"), { wrapper })
      const first = getInstance(0)

      act(() => {
        first.emitOpen()
        first.emitFatalError()
      })
      expect(first.close).toHaveBeenCalled()

      // 백오프(1초) 경과 → 토큰 갱신 → 새 EventSource 생성
      await act(async () => {
        jest.advanceTimersByTime(1_000)
        await Promise.resolve()
      })

      expect(mockedRefresh).toHaveBeenCalledTimes(1)
      expect(MockEventSource.instances).toHaveLength(2)

      // 재연결 성공 → 끊긴 동안 놓친 이벤트 보상을 위한 1회 무효화
      act(() => {
        getInstance(1).emitOpen()
      })
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["workspaces", "ws-1", "browser"],
      })
    } finally {
      jest.useRealTimers()
    }
  })

  it("토큰 갱신 실패 시 재연결을 중단한다", async () => {
    jest.useFakeTimers()
    try {
      mockedRefresh.mockRejectedValueOnce(new Error("refresh expired"))
      renderHook(() => useFileBrowserSSE("ws-1"), { wrapper })

      act(() => {
        getInstance(0).emitOpen()
        getInstance(0).emitFatalError()
      })

      await act(async () => {
        jest.advanceTimersByTime(1_000)
        await Promise.resolve()
      })

      // 갱신 실패 → 새 커넥션을 만들지 않음
      expect(MockEventSource.instances).toHaveLength(1)
    } finally {
      jest.useRealTimers()
    }
  })

  it("언마운트 시 커넥션을 정리한다", () => {
    const { unmount } = renderHook(() => useFileBrowserSSE("ws-1"), {
      wrapper,
    })

    unmount()

    expect(getInstance(0).close).toHaveBeenCalled()
  })
})
