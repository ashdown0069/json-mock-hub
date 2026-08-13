"use client"

import { useWorkspaceBasePath } from "@/hooks/useWorkspaceBasePath"
import { useGetBrowserItems } from "@/features/file-browser/api/getBrowserItems"
import { useFileBrowser } from "@/features/file-browser/store/useFileBrowser"
import { FileItem } from "@/features/file-browser/types"

/**
 * 좌측 트리에서 선택된 File 항목을 조회한다.
 *
 * item은 react-query 캐시(items)에서 파생되는 서버 상태이므로 Zustand에는
 * activeItem(id 문자열)만 저장한다. 여기서 매번 다시 조합해야 mutation 이후
 * 캐시가 갱신될 때 item도 함께 최신 상태를 유지한다.
 */
export function useSelectedFile(): {
  item: FileItem | undefined
  workspaceId: string
} {
  const { workspaceId } = useWorkspaceBasePath()
  const { data: items = [] } = useGetBrowserItems(workspaceId)
  const activeItem = useFileBrowser((state) => state.activeItem)

  const item = items.find(
    (candidate) => candidate.id === activeItem && candidate.itemType === "File",
  )

  return { item, workspaceId }
}
