"use client"

import { useState, useRef } from "react"
import dynamic from "next/dynamic"
import { FileTree } from "./FileTree"
import { TreeActionButtons } from "./TreeActionButtons"
import { useMockApiDialog } from "@/features/mock-api/hooks/useMockApiDialog"
import { useWorkspaceBasePath } from "@/hooks/useWorkspaceBasePath"
import type { TreeApi } from "react-arborist"
import type { FileTree as FileTreeNodeData } from "../types"

// 다이얼로그는 faker(더미 데이터 생성)와 스키마 에디터를 끌고 오는 가장 무거운
// 화면이다. 정적 import로 두면 /apis·/code에 들어오기만 해도 약 194KB(gzip)를
// 내려받는다. named export이므로 default를 꺼내 준다.
const CreateMockApiDialog = dynamic(
  () =>
    import("@/features/mock-api/components/create/CreateMockApiDialog").then(
      (mod) => mod.CreateMockApiDialog,
    ),
  { ssr: false },
)

export function ApisExplorer() {
  const { workspaceId, basePath } = useWorkspaceBasePath()
  const treeRef = useRef<TreeApi<FileTreeNodeData>>(null)

  const dialog = useMockApiDialog(workspaceId, basePath)

  // 한 번이라도 연 뒤에는 마운트를 유지한다. isOpen만으로 언마운트하면
  // shadcn Dialog의 닫힘 애니메이션(data-[state=closed]:animate-out)이 잘린다.
  // 첫 렌더에는 마운트되지 않으므로 초기 번들 효과는 그대로 얻는다.
  const [dialogMounted, setDialogMounted] = useState(false)
  if (dialog.isOpen && !dialogMounted) setDialogMounted(true)

  const handleCreateRootFolder = () => {
    treeRef.current?.create({
      parentId: null,
      index: 0,
      type: "internal",
    })
  }

  return (
    <div className="flex h-full w-[300px] flex-col border-r bg-slate-50">
      <div className="flex items-center justify-between border-b p-4">
        <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          APIs Explorer
        </h2>
        <TreeActionButtons
          onCreateFolder={handleCreateRootFolder}
          onCreateFile={() => dialog.openCreate(null, "/")}
        />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden p-2">
        <FileTree
          treeRef={treeRef}
          onCreateMockApi={dialog.openCreate}
          onEditMockApi={dialog.openEdit}
        />
      </div>

      {/* Mock API 생성/수정 다이얼로그 (루트/폴더 공용) */}
      {dialogMounted ? (
        <CreateMockApiDialog
          isOpen={dialog.isOpen}
          onClose={dialog.close}
          onCreate={dialog.onSubmit}
          workspaceId={workspaceId}
          parentPath={dialog.parentPath}
          editItem={dialog.editTarget}
        />
      ) : null}
    </div>
  )
}
