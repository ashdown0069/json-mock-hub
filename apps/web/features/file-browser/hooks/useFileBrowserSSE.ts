import { useQueryClient } from "@tanstack/react-query"
import { browserKeys } from "@/lib/queryKeys"
import { useWorkspaceSSE } from "@/hooks/useWorkspaceSSE"

export const useFileBrowserSSE = (workspaceId: string) => {
  const queryClient = useQueryClient()
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: browserKeys.all(workspaceId) })
  }

  useWorkspaceSSE({
    workspaceId,
    channel: "filebrowser",
    onResync: invalidate,
    onMessage: (payload) => {
      if (!payload || typeof payload !== "object") return
      if (!("workspaceId" in payload) || payload.workspaceId !== workspaceId) return
      if (!("action" in payload) || typeof payload.action !== "string") return
      if (
        !["CREATE", "MOVE", "RENAME", "UPDATE", "DELETE"].includes(
          payload.action
        )
      ) {
        return
      }
      invalidate()
    },
  })
}
