import { useEffect, useRef } from "react"
import { requestAccessTokenRefresh } from "@/lib/axios"

export interface WorkspaceSSEOptions {
  workspaceId: string
  channel: "filebrowser" | "mockstate"
  onMessage: (payload: unknown) => void
  onResync: () => void
}

export function useWorkspaceSSE(options: WorkspaceSSEOptions): void {
  const { workspaceId, channel, onMessage, onResync } = options

  const callbacks = useRef({ onMessage, onResync })
  useEffect(() => {
    callbacks.current = { onMessage, onResync }
  }, [onMessage, onResync])

  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4001"

  useEffect(() => {
    if (!workspaceId) return

    let source: EventSource | null = null
    let disposed = false
    let refreshPending = false
    let closedRecoveryUsed = false

    const closeSource = (target: EventSource | null = source) => {
      if (!target) return
      if (source === target) source = null
      target.onopen = null
      target.onmessage = null
      target.onerror = null
      target.close()
    }

    const connect = () => {
      if (disposed) return
      if (
        source &&
        (source.readyState === EventSource.OPEN ||
          source.readyState === EventSource.CONNECTING)
      ) {
        return
      }

      const currentSource = new EventSource(
        `${backendUrl}/${workspaceId}/${channel}/subscribe`,
        { withCredentials: true }
      )
      source = currentSource
      const isCurrent = () => !disposed && source === currentSource

      currentSource.onopen = () => {
        if (!isCurrent()) return
        closedRecoveryUsed = false
        callbacks.current.onResync()
      }

      currentSource.onmessage = (event) => {
        if (!isCurrent()) return
        try {
          callbacks.current.onMessage(JSON.parse(event.data))
        } catch {
          // 잘못된 JSON은 무시하며 payload나 인증 정보를 출력하지 않는다.
        }
      }

      currentSource.onerror = () => {
        if (!isCurrent()) return
        if (currentSource.readyState === EventSource.CONNECTING) return
        closeSource(currentSource)
        if (closedRecoveryUsed || refreshPending) return

        closedRecoveryUsed = true
        refreshPending = true
        void requestAccessTokenRefresh()
          .then(() => {
            if (!disposed && !source) connect()
          })
          .catch(() => undefined)
          .finally(() => {
            refreshPending = false
          })
      }
    }

    const wake = () => {
      if (disposed || refreshPending) return
      if (
        source &&
        (source.readyState === EventSource.OPEN ||
          source.readyState === EventSource.CONNECTING)
      ) {
        return
      }
      closeSource()
      closedRecoveryUsed = false
      connect()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") wake()
    }
    const handleOnline = () => wake()

    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("online", handleOnline)
    connect()

    return () => {
      disposed = true
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("online", handleOnline)
      closeSource()
    }
  }, [workspaceId, channel, backendUrl])
}
