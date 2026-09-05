"use client"

import { useParams } from "next/navigation"
import { Tree, type TreeApi } from "react-arborist"
import { FileTreeNode } from "./FileTreeNode"
import { useTranslations } from "next-intl"
import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { useMyPermissions } from "@/hooks/useMyPermissions"
import { useElementSize } from "@/hooks/useElementSize"
import { FileItem, FileTree as FileTreeNodeData } from "../types"
import { useFileTreeData } from "../hooks/useFileTreeData"
import { useFileTreeActions } from "../hooks/useFileTreeActions"

/**
 * react-arborist의 폴더 판별 기준을 itemType으로 고정한다.
 *
 * 라이브러리는 children이 배열인지로 폴더/파일을 나눈다(node-api.ts의 isLeaf).
 * buildTree는 자식이 실제로 있을 때만 children을 만들므로 빈 폴더가 leaf로 오판되어
 * 드롭 지점이 항상 형제로 계산됐다("새 폴더로 정리하기"가 불가능).
 * create-root.ts가 if (children)로 검사하므로 빈 배열도 truthy → isInternal이 된다.
 */
export function folderChildrenAccessor(
  node: FileTreeNodeData
): FileTreeNodeData[] | null {
  if (node.itemType !== "Folder") return null
  return node.children ?? []
}

interface FileTreeProps {
  /** Mock API(File) 생성 요청을 다이얼로그로 위임합니다 (부모 폴더 id/경로 전달) */
  onCreateMockApi: (parentId: string | null, parentPath: string) => void
  onEditMockApi: (item: FileItem) => void
  treeRef?: React.Ref<TreeApi<FileTreeNodeData> | undefined>
}

export function FileTree({
  onCreateMockApi,
  onEditMockApi,
  treeRef,
}: FileTreeProps) {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const t = useTranslations("FileBrowser")
  const { ref: containerRef, width, height } = useElementSize<HTMLDivElement>()

  // canMove가 없으면 드래그 자체를 차단 (버튼이 아닌 dnd 동작이라 disableDrag로 처리).
  // 권한은 Context가 아니라 이 컴포넌트가 workspaceId로 직접 조회한다 —
  // TreeActionButtons/useFileTreeActions도 각자 같은 훅을 호출하며,
  // react-query가 캐시를 공유하므로 중복 네트워크 요청은 생기지 않는다.
  const { canMove, isError: isPermissionError } = useMyPermissions(workspaceId)

  const { flatItems, treeData, isLoading, isError, refetch, tempNode, setTempNode } =
    useFileTreeData(workspaceId)

  const { onCreate, onRename, onMove, onDelete } = useFileTreeActions({
    workspaceId,
    flatItems,
    tempNode,
    setTempNode,
    onCreateMockApi,
  })

  if (isLoading) {
    return (
      <div data-testid="file-tree-skeleton" className="space-y-2 p-3">
        <Skeleton className="h-6 w-3/4 rounded" />
        <Skeleton className="h-6 w-full rounded" />
        <Skeleton className="h-6 w-5/6 rounded" />
        <Skeleton className="h-6 w-2/3 rounded" />
      </div>
    )
  }

  // 실패를 "빈 워크스페이스"로 위장하면 사용자가 데이터가 사라졌다고 오인한다
  if (isError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
        <p className="text-xs text-muted-foreground">{t("loadFailed")}</p>
        <Button size="sm" variant="outline" onClick={() => refetch()}>
          {t("retry")}
        </Button>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="min-h-0 w-full flex-1">
      {/* 권한 조회가 실패하면 모든 플래그가 false로 폴백되어 버튼이 조용히 사라진다.
          기능이 없는 것인지 장애인지 구분할 수 있게 알린다. */}
      {isPermissionError ? (
        <p className="px-3 py-2 text-xs text-amber-700">
          {t("permissionLoadFailed")}
        </p>
      ) : null}

      {/* 측정 전(0×0)에는 렌더하지 않아 300×500 기본값이 잠깐 보이는 것을 막는다 */}
      {width > 0 && height > 0 ? (
        <Tree
          ref={treeRef}
          data={treeData}
          childrenAccessor={folderChildrenAccessor}
          width={width}
          height={height}
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
              onCancelCreate={() => setTempNode(null)}
              onEditMockApi={(id) => {
                const item = flatItems.find((i) => i.id === id)
                if (item) onEditMockApi(item)
              }}
            />
          )}
        </Tree>
      ) : null}
    </div>
  )
}
