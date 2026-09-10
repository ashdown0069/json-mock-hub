import { renderHook, act } from "@testing-library/react"
import { useWorkspaceSSE } from "../useWorkspaceSSE"
import { requestAccessTokenRefresh } from "@/lib/axios"

jest.mock("@/lib/axios", () => ({
  requestAccessTokenRefresh: jest.fn(),
}))

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
    this.onmessage?.({
      data: typeof data === "string" ? data : JSON.stringify(data),
    })
  }

  emitFatalError() {
    this.readyState = MockEventSource.CLOSED
    this.onerror?.()
  }

  emitTransientError() {
    this.readyState = MockEventSource.CONNECTING
    this.onerror?.()
  }
}

const flushPromises = async () => {
  await act(async () => {
    await Promise.resolve()
  })
}

describe("useWorkspaceSSE 공통 훅", () => {
  let currentVisibility: DocumentVisibilityState = "visible"

  beforeEach(() => {
    jest.clearAllMocks()
    MockEventSource.instances = []
    Object.defineProperty(globalThis, "EventSource", {
      value: MockEventSource,
      configurable: true,
      writable: true,
    })
    currentVisibility = "visible"
    Object.defineProperty(document, "visibilityState", {
      get: () => currentVisibility,
      configurable: true,
    })
    jest.mocked(requestAccessTokenRefresh).mockResolvedValue(undefined)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("빈 workspace: EventSource와 listener를 만들지 않음", () => {
    const { unmount } = renderHook(() =>
      useWorkspaceSSE({
        workspaceId: "",
        channel: "filebrowser",
        onMessage: jest.fn(),
        onResync: jest.fn(),
      })
    )
    expect(MockEventSource.instances).toHaveLength(0)
    unmount()
  })

  it("최초 연결: URL에 workspace/channel 포함, withCredentials === true", () => {
    const { unmount } = renderHook(() =>
      useWorkspaceSSE({
        workspaceId: "ws1",
        channel: "filebrowser",
        onMessage: jest.fn(),
        onResync: jest.fn(),
      })
    )
    expect(MockEventSource.instances).toHaveLength(1)
    const instance = MockEventSource.instances[0]!
    expect(instance.url).toContain("/ws1/filebrowser/subscribe")
    expect(instance.withCredentials).toBe(true)
    unmount()
  })

  it("최초·재연결 open: 매 open마다 onResync 1회", () => {
    const onResync = jest.fn()
    const { unmount } = renderHook(() =>
      useWorkspaceSSE({
        workspaceId: "ws1",
        channel: "filebrowser",
        onMessage: jest.fn(),
        onResync,
      })
    )
    expect(onResync).not.toHaveBeenCalled()
    const first = MockEventSource.instances[0]!
    act(() => first.emitOpen())
    expect(onResync).toHaveBeenCalledTimes(1)

    act(() => first.emitTransientError())
    act(() => first.emitOpen())
    expect(onResync).toHaveBeenCalledTimes(2)
    unmount()
  })

  it("CONNECTING 오류: close·refresh·추가 EventSource 없음", async () => {
    const { unmount } = renderHook(() =>
      useWorkspaceSSE({
        workspaceId: "ws1",
        channel: "filebrowser",
        onMessage: jest.fn(),
        onResync: jest.fn(),
      })
    )
    const first = MockEventSource.instances[0]!
    act(() => first.emitTransientError())
    await flushPromises()

    expect(first.close).not.toHaveBeenCalled()
    expect(MockEventSource.instances).toHaveLength(1)
    expect(requestAccessTokenRefresh).not.toHaveBeenCalled()
    unmount()
  })

  it("첫 CLOSED: 이전 source close, refresh 1회, 새 source 1개", async () => {
    const { unmount } = renderHook(() =>
      useWorkspaceSSE({
        workspaceId: "ws1",
        channel: "filebrowser",
        onMessage: jest.fn(),
        onResync: jest.fn(),
      })
    )
    const first = MockEventSource.instances[0]!
    act(() => first.emitFatalError())
    await flushPromises()

    expect(first.close).toHaveBeenCalled()
    expect(requestAccessTokenRefresh).toHaveBeenCalledTimes(1)
    expect(MockEventSource.instances).toHaveLength(2)
    unmount()
  })

  it("CLOSED 복구 후 새 연결이 열리기 전에 다시 CLOSED이면 자동 반복을 중단한다", async () => {
    const { unmount } = renderHook(() =>
      useWorkspaceSSE({
        workspaceId: "ws1",
        channel: "filebrowser",
        onMessage: jest.fn(),
        onResync: jest.fn(),
      })
    )

    act(() => MockEventSource.instances[0]!.emitFatalError())
    await flushPromises()
    expect(requestAccessTokenRefresh).toHaveBeenCalledTimes(1)
    expect(MockEventSource.instances).toHaveLength(2)

    act(() => MockEventSource.instances[1]!.emitFatalError())
    await flushPromises()
    expect(requestAccessTokenRefresh).toHaveBeenCalledTimes(1)
    expect(MockEventSource.instances).toHaveLength(2)
    unmount()
  })

  it("refresh reject: 새 source 없음, unhandled rejection 없음", async () => {
    jest
      .mocked(requestAccessTokenRefresh)
      .mockRejectedValue(new Error("Refresh failed"))
    const { unmount } = renderHook(() =>
      useWorkspaceSSE({
        workspaceId: "ws1",
        channel: "filebrowser",
        onMessage: jest.fn(),
        onResync: jest.fn(),
      })
    )
    act(() => MockEventSource.instances[0]!.emitFatalError())
    await flushPromises()

    expect(requestAccessTokenRefresh).toHaveBeenCalledTimes(1)
    expect(MockEventSource.instances).toHaveLength(1)
    unmount()
  })

  it("자동 복구가 중단된 뒤 visible 복귀는 새 연결 시도 한 번을 허용한다 (활성 source는 유지)", async () => {
    let visibility: DocumentVisibilityState = "visible"
    Object.defineProperty(document, "visibilityState", {
      get: () => visibility,
      configurable: true,
    })
    const { unmount } = renderHook(() =>
      useWorkspaceSSE({
        workspaceId: "ws1",
        channel: "filebrowser",
        onMessage: jest.fn(),
        onResync: jest.fn(),
      })
    )

    act(() => MockEventSource.instances[0]!.emitFatalError())
    await flushPromises()
    act(() => MockEventSource.instances[1]!.emitFatalError())
    await flushPromises()

    visibility = "hidden"
    act(() => document.dispatchEvent(new Event("visibilitychange")))
    expect(MockEventSource.instances).toHaveLength(2)

    visibility = "visible"
    act(() => document.dispatchEvent(new Event("visibilitychange")))
    expect(MockEventSource.instances).toHaveLength(3)
    expect(requestAccessTokenRefresh).toHaveBeenCalledTimes(1)

    act(() => document.dispatchEvent(new Event("visibilitychange")))
    expect(MockEventSource.instances).toHaveLength(3)

    unmount()
  })

  it("online wake: source가 없을 때 새 source 1개", async () => {
    const { unmount } = renderHook(() =>
      useWorkspaceSSE({
        workspaceId: "ws1",
        channel: "filebrowser",
        onMessage: jest.fn(),
        onResync: jest.fn(),
      })
    )
    act(() => MockEventSource.instances[0]!.emitFatalError())
    await flushPromises()
    act(() => MockEventSource.instances[1]!.emitFatalError())
    await flushPromises()
    expect(MockEventSource.instances).toHaveLength(2)

    act(() => window.dispatchEvent(new Event("online")))
    expect(MockEventSource.instances).toHaveLength(3)
    unmount()
  })

  it("새 source open 후 후속 CLOSED: recovery 사용 표시가 초기화되어 refresh 가능", async () => {
    const { unmount } = renderHook(() =>
      useWorkspaceSSE({
        workspaceId: "ws1",
        channel: "filebrowser",
        onMessage: jest.fn(),
        onResync: jest.fn(),
      })
    )

    act(() => MockEventSource.instances[0]!.emitFatalError())
    await flushPromises()
    expect(MockEventSource.instances).toHaveLength(2)
    expect(requestAccessTokenRefresh).toHaveBeenCalledTimes(1)

    act(() => MockEventSource.instances[1]!.emitOpen())

    act(() => MockEventSource.instances[1]!.emitFatalError())
    await flushPromises()
    expect(requestAccessTokenRefresh).toHaveBeenCalledTimes(2)
    expect(MockEventSource.instances).toHaveLength(3)
    unmount()
  })

  it("workspace 변경: 이전 source close, 이전 handler 영향 없음, 새 URL 생성", () => {
    const onResync = jest.fn()
    const { rerender, unmount } = renderHook(
      ({ ws }) =>
        useWorkspaceSSE({
          workspaceId: ws,
          channel: "filebrowser",
          onMessage: jest.fn(),
          onResync,
        }),
      { initialProps: { ws: "ws1" } }
    )
    const first = MockEventSource.instances[0]!
    rerender({ ws: "ws2" })
    expect(first.close).toHaveBeenCalled()
    expect(MockEventSource.instances).toHaveLength(2)
    expect(MockEventSource.instances[1]!.url).toContain("/ws2/filebrowser/subscribe")

    act(() => first.emitOpen())
    expect(onResync).not.toHaveBeenCalled()
    unmount()
  })

  it("refresh 중 unmount: Promise 완료 후 source 부활 없음", async () => {
    let resolveRefresh!: () => void
    jest.mocked(requestAccessTokenRefresh).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRefresh = resolve
        })
    )
    const { unmount } = renderHook(() =>
      useWorkspaceSSE({
        workspaceId: "ws1",
        channel: "filebrowser",
        onMessage: jest.fn(),
        onResync: jest.fn(),
      })
    )
    act(() => MockEventSource.instances[0]!.emitFatalError())
    await flushPromises()
    expect(requestAccessTokenRefresh).toHaveBeenCalledTimes(1)

    unmount()
    act(() => {
      resolveRefresh()
    })
    await flushPromises()
    expect(MockEventSource.instances).toHaveLength(1)
  })

  it("잘못된 JSON: onMessage 호출 없음", () => {
    const onMessage = jest.fn()
    const { unmount } = renderHook(() =>
      useWorkspaceSSE({
        workspaceId: "ws1",
        channel: "filebrowser",
        onMessage,
        onResync: jest.fn(),
      })
    )
    const first = MockEventSource.instances[0]!
    act(() => first.emitOpen())
    act(() => first.emitMessage("invalid{json"))
    expect(onMessage).not.toHaveBeenCalled()

    act(() => first.emitMessage({ valid: true }))
    expect(onMessage).toHaveBeenCalledWith({ valid: true })
    unmount()
  })

  it("cleanup: EventSource close 및 visibility/online listener 제거", () => {
    const removeEventListenerSpy = jest.spyOn(document, "removeEventListener")
    const windowRemoveSpy = jest.spyOn(window, "removeEventListener")

    const { unmount } = renderHook(() =>
      useWorkspaceSSE({
        workspaceId: "ws1",
        channel: "filebrowser",
        onMessage: jest.fn(),
        onResync: jest.fn(),
      })
    )
    const first = MockEventSource.instances[0]!
    unmount()

    expect(first.close).toHaveBeenCalled()
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function)
    )
    expect(windowRemoveSpy).toHaveBeenCalledWith("online", expect.any(Function))
  })
})
