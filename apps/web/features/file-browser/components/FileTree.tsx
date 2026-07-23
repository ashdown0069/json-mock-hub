"use client"

import { useParams } from "next/navigation"
import { Tree } from "react-arborist"
import { FileTreeNode } from "./FileTreeNode"
import { useMyPermissions } from "@/hooks/useMyPermissions"
import { FileItem } from "../types"
import { useFileTreeData } from "../hooks/useFileTreeData"
import { useFileTreeActions } from "../hooks/useFileTreeActions"

interface FileTreeProps {
  /** Mock API(File) 생성 요청을 다이얼로그로 위임합니다 (부모 폴더 id/경로 전달) */
  onCreateMockApi: (parentId: string | null, parentPath: string) => void
  onEditMockApi: (item: FileItem) => void
}

export function FileTree({ onCreateMockApi, onEditMockApi }: FileTreeProps) {
  const params = useParams()
  const workspaceId = params.workspaceId as string

  // canMove가 없으면 드래그 자체를 차단 (버튼이 아닌 dnd 동작이라 disableDrag로 처리)
  const { canMove, canCreate, canRename, canDelete, canUpdate } =
    useMyPermissions(workspaceId)

  const { flatItems, treeData, isLoading, tempNode, setTempNode } =
    useFileTreeData(workspaceId)

  const { onCreate, onRename, onMove, onDelete } = useFileTreeActions({
    workspaceId,
    flatItems,
    tempNode,
    setTempNode,
    canMove,
    onCreateMockApi,
  })

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-slate-400">
        Loading APIs...
      </div>
    )
  }

  return (
    <div className="min-h-0 w-full flex-1">
      <Tree
        data={treeData}
        rowHeight={32}
        indent={16}
        openByDefault={true}
        className="pb-4"
        disableDrag={!canMove}
        onCreate={onCreate}
        onRename={onRename}
        onMove={onMove}
        onDelete={onDelete}
      >
        {(props) => (
          <FileTreeNode
            {...props}
            canCreate={canCreate}
            canRename={canRename}
            canDelete={canDelete}
            canUpdate={canUpdate}
            onCancelCreate={() => setTempNode(null)}
            onEditMockApi={(id) => {
              const item = flatItems.find((i) => i.id === id)
              if (item) onEditMockApi(item)
            }}
          />
        )}
      </Tree>
    </div>
  )
}
