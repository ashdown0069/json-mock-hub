"use client"

import { useState, useRef } from "react"
import dynamic from "next/dynamic"
import { useBoolean } from "usehooks-ts"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { FileTree } from "./FileTree"
import { TreeActionButtons } from "./TreeActionButtons"
import { Input } from "@workspace/ui/components/input"
import { useMockApiDialog } from "@/features/mock-api/hooks/useMockApiDialog"
import { useCreateBrowserItem } from "../api/createBrowserItem"
import { useWorkspaceBasePath } from "@/hooks/useWorkspaceBasePath"
import { isValidItemName } from "@/lib/validateItemName"

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
  const t = useTranslations("errors")
  const { workspaceId, basePath } = useWorkspaceBasePath()

  // 폴더는 인라인 입력으로 생성하고, Mock API(File)는 다이얼로그로 생성합니다.
  const {
    value: creatingFolder,
    setTrue: startCreatingFolder,
    setFalse: stopCreatingFolder,
  } = useBoolean(false)
  const [rootItemName, setRootItemName] = useState("")
  const { mutate: createItem } = useCreateBrowserItem(workspaceId)
  const dialog = useMockApiDialog(workspaceId, basePath)
  const hasSubmittedRef = useRef(false)

  // 한 번이라도 연 뒤에는 마운트를 유지한다. isOpen만으로 언마운트하면
  // shadcn Dialog의 닫힘 애니메이션(data-[state=closed]:animate-out)이 잘린다.
  // 첫 렌더에는 마운트되지 않으므로 초기 번들 효과는 그대로 얻는다.
  const [dialogMounted, setDialogMounted] = useState(false)
  if (dialog.isOpen && !dialogMounted) setDialogMounted(true)

  const handleRootCreate = () => {
    if (hasSubmittedRef.current) return
    const name = rootItemName.trim()
    if (!name) {
      stopCreatingFolder()
      setRootItemName("")
      return
    }

    hasSubmittedRef.current = true
    if (!isValidItemName(name)) {
      toast.error(t("itemNameRule"), { position: "top-center" })
      hasSubmittedRef.current = false
    } else {
      createItem({ name, itemType: "Folder", parentId: null })
    }
    stopCreatingFolder()
    setRootItemName("")
  }

  return (
    <div className="flex h-full w-[300px] flex-col border-r bg-slate-50">
      <div className="flex items-center justify-between border-b p-4">
        <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          APIs Explorer
        </h2>
        <TreeActionButtons
          onCreateFolder={() => {
            hasSubmittedRef.current = false
            startCreatingFolder()
          }}
          onCreateFile={() => dialog.openCreate(null, "/")}
        />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden p-2">
        {creatingFolder && (
          <div className="mb-2 px-2">
            <Input
              autoFocus
              placeholder="New folder..."
              value={rootItemName}
              onChange={(e) => setRootItemName(e.target.value)}
              onBlur={handleRootCreate}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRootCreate()
                if (e.key === "Escape") {
                  hasSubmittedRef.current = true // 후속 onBlur 방어
                  stopCreatingFolder()
                  setRootItemName("")
                }
              }}
              className="h-7 text-xs"
            />
          </div>
        )}
        <FileTree
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
