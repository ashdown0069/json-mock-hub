import { useQueryClient } from "@tanstack/react-query"
import { mockStateKeys } from "@/lib/queryKeys"
import { useWorkspaceSSE } from "@/hooks/useWorkspaceSSE"

export const useMockStateSSE = (workspaceId: string) => {
  const queryClient = useQueryClient()

  useWorkspaceSSE({
    workspaceId,
    channel: "mockstate",
    onResync: () => {
      void queryClient.invalidateQueries({
        queryKey: ["workspaces", workspaceId, "mockState"],
      })
    },
    onMessage: (payload) => {
      if (!payload || typeof payload !== "object") return
      if (!("workspaceId" in payload) || payload.workspaceId !== workspaceId) return
      if (!("path" in payload) || typeof payload.path !== "string") return
      void queryClient.invalidateQueries({
        queryKey: mockStateKeys.effective(workspaceId, payload.path),
      })
    },
  })
}
