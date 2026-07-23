"use client"

import type {
  CreateHandler,
  DeleteHandler,
  MoveHandler,
  RenameHandler,
} from "react-arborist"
import { FileItem, FileTree } from "../types"
import { resolveRenameAction } from "../utils/resolveRenameAction"
import { useCreateBrowserItem } from "../api/createBrowserItem"
import { useRenameBrowserItem } from "../api/renameBrowserItem"
import { useMoveBrowserItems } from "../api/moveBrowserItems"
import { useDeleteBrowserItems } from "../api/deleteBrowserItems"

interface UseFileTreeActionsArgs {
  workspaceId: string
  flatItems: FileItem[]
  tempNode: FileItem | null
  setTempNode: (node: FileItem | null) => void
  canMove: boolean
  onCreateMockApi: (parentId: string | null, parentPath: string) => void
}

// 트리 이벤트(create/rename/move/delete)를 mutation 호출로 연결하는 훅
export function useFileTreeActions({
  workspaceId,
  flatItems,
  tempNode,
  setTempNode,
  canMove,
  onCreateMockApi,
}: UseFileTreeActionsArgs) {
  const { mutate: createItem } = useCreateBrowserItem(workspaceId)
  const { mutate: renameItem } = useRenameBrowserItem(workspaceId)
  const { mutate: moveItems } = useMoveBrowserItems(workspaceId)
  const { mutate: deleteItems } = useDeleteBrowserItems(workspaceId)

  const onCreate: CreateHandler<FileTree> = ({ parentId, type }) => {
    // Mock API(File)는 인라인 임시 노드 대신 스키마 빌더 다이얼로그로 생성한다
    if (type === "leaf") {
      const parent = flatItems.find((item) => item.id === parentId)
      onCreateMockApi(parentId, parent?.path ?? "/")
      return null
    }

    const newTempNode: FileItem = {
      id: `temp-${Date.now()}`,
      name: "",
      itemType: "Folder",
      parentId: parentId || null,
    }
    setTempNode(newTempNode)
    return newTempNode
  }

  const onRename: RenameHandler<FileTree> = ({ id, name }) => {
    const action = resolveRenameAction(id, name, tempNode)
    if (action.kind === "create") createItem(action.payload)
    if (action.kind === "rename") renameItem(action.payload)
    if (id.startsWith("temp-")) setTempNode(null)
  }

  const onMove: MoveHandler<FileTree> = ({ dragIds, parentId }) => {
    if (!canMove) return
    moveItems({ dragIds, parentId: parentId || null })
  }

  const onDelete: DeleteHandler<FileTree> = ({ ids }) => {
    deleteItems(ids)
  }

  return { onCreate, onRename, onMove, onDelete }
}
