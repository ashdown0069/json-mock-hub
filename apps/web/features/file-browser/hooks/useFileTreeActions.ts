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

import { useMyPermissions } from "@/hooks/useMyPermissions"

interface UseFileTreeActionsArgs {
  workspaceId: string
  flatItems: FileItem[]
  tempNode: FileItem | null
  setTempNode: (node: FileItem | null) => void
  onCreateMockApi: (parentId: string | null, parentPath: string) => void
}

// 트리 이벤트(create/rename/move/delete)를 mutation 호출로 연결하는 훅.
// 키보드 단축키(Backspace/Enter/a/A)는 버튼 UI를 우회해 직접 들어오므로,
// 백엔드가 403으로 막기 전에 여기서도 게이팅한다 (불필요한 403 토스트 방지).
//
// 권한은 이미 인자로 받는 workspaceId로 useMyPermissions를 직접 호출해 구한다 —
// react-query가 캐시를 공유하므로 FileTree/TreeActionButtons와 중복 네트워크
// 요청 없이 항상 같은 값을 본다.
export function useFileTreeActions({
  workspaceId,
  flatItems,
  tempNode,
  setTempNode,
  onCreateMockApi,
}: UseFileTreeActionsArgs) {
  const { canCreate, canRename, canMove, canDelete } = useMyPermissions(workspaceId)
  const { mutate: createItem } = useCreateBrowserItem(workspaceId)
  const { mutate: renameItem } = useRenameBrowserItem(workspaceId)
  const { mutate: moveItems } = useMoveBrowserItems(workspaceId)
  const { mutate: deleteItems } = useDeleteBrowserItems(workspaceId)

  const onCreate: CreateHandler<FileTree> = ({ parentId, type }) => {
    if (!canCreate) return null

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
    // 임시 노드 확정은 생성 권한, 기존 노드 변경은 이름 변경 권한이 필요하다
    if (action.kind === "create" && canCreate) createItem(action.payload)
    if (action.kind === "rename" && canRename) renameItem(action.payload)
    if (id.startsWith("temp-")) setTempNode(null)
  }

  const onMove: MoveHandler<FileTree> = ({ dragIds, parentId }) => {
    if (!canMove) return
    moveItems({ dragIds, parentId: parentId || null })
  }

  const onDelete: DeleteHandler<FileTree> = ({ ids }) => {
    if (!canDelete) return
    deleteItems(ids)
  }

  return { onCreate, onRename, onMove, onDelete }
}

