import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { mockStateKeys } from "@/lib/queryKeys"
import { refreshAccessToken } from "@/lib/axios"

const MAX_RETRIES = 5
const BASE_RETRY_DELAY_MS = 1_000

export const useMockStateSSE = (workspaceId: string) => {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!workspaceId) return

    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4001"
    const sseUrl = `${backendUrl}/${workspaceId}/mockstate/subscribe`

    let eventSource: EventSource | null = null
    let retryTimer: ReturnType<typeof setTimeout> | null = null
    let retryCount = 0
    let hasConnectedOnce = false
    let disposed = false

    // 재연결 보상은 어떤 경로가 바뀌었는지 알 수 없으므로 워크스페이스 전체를 무효화한다
    const invalidateAll = () =>
      queryClient.invalidateQueries({
        queryKey: ["workspaces", workspaceId, "mockState"],
      })

    const connect = () => {
      if (disposed) return
      eventSource = new EventSource(sseUrl, { withCredentials: true })

      eventSource.onopen = () => {
        retryCount = 0
        // 재연결이라면 끊긴 동안 놓친 이벤트 보상을 위해 1회 무효화
        if (hasConnectedOnce) invalidateAll()
        hasConnectedOnce = true
      }

      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data)
          if (parsed.workspaceId === workspaceId && typeof parsed.path === "string") {
            queryClient.invalidateQueries({
              queryKey: mockStateKeys.effective(workspaceId, parsed.path),
            })
          }
        } catch (err) {
          console.error("SSE parse error:", err)
        }
      }

      eventSource.onerror = () => {
        // CONNECTING: 브라우저 내장 자동 재연결 진행 중 → 개입하지 않음
        if (eventSource?.readyState === EventSource.CONNECTING) return

        // CLOSED: HTTP 거절(401 등)로 브라우저가 재연결을 포기한 상태
        eventSource?.close()
        if (disposed || retryCount >= MAX_RETRIES) return

        const delay = BASE_RETRY_DELAY_MS * 2 ** retryCount
        retryCount += 1
        retryTimer = setTimeout(async () => {
          try {
            // access token 만료가 가장 흔한 원인이므로 갱신 후 재연결
            await refreshAccessToken()
          } catch {
            return // 리프레시 토큰도 만료 → 재연결 중단
          }
          connect()
        }, delay)
      }
    }

    connect()

    return () => {
      disposed = true
      if (retryTimer) clearTimeout(retryTimer)
      eventSource?.close()
    }
  }, [workspaceId, queryClient])
}
