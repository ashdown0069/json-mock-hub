"use client"

import { useState, useRef } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { FileTree } from "./FileTree"
import { TreeActionButtons } from "./TreeActionButtons"
import { useMyPermissions } from "@/hooks/useMyPermissions"
import { Input } from "@workspace/ui/components/input"
import { CreateMockApiDialog } from "@/features/mock-api/components/create/CreateMockApiDialog"
import { useMockApiDialog } from "@/features/mock-api/hooks/useMockApiDialog"
import { useCreateBrowserItem } from "../api/createBrowserItem"
import { useWorkspaceBasePath } from "@/hooks/useWorkspaceBasePath"
import { isValidItemName } from "@/lib/validateItemName"

export function ApisExplorer() {
  const t = useTranslations("errors")
  const { workspaceId, basePath } = useWorkspaceBasePath()
  const { canCreate } = useMyPermissions(workspaceId)

  // 폴더는 인라인 입력으로 생성하고, Mock API(File)는 다이얼로그로 생성합니다.
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [rootItemName, setRootItemName] = useState("")
  const { mutate: createItem } = useCreateBrowserItem(workspaceId)
  const dialog = useMockApiDialog(workspaceId, basePath)
  const hasSubmittedRef = useRef(false)

  // 루트 폴더 생성 시 공용 이름 검증 규칙을 사용해 검사합니다.
  const handleRootCreate = () => {
    if (hasSubmittedRef.current) return
    const name = rootItemName.trim()
    if (!name) {
      setCreatingFolder(false)
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
    setCreatingFolder(false)
    setRootItemName("")
  }

  return (
    <div className="flex h-full w-[300px] flex-col border-r bg-slate-50">
      <div className="flex items-center justify-between border-b p-4">
        <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          APIs Explorer
        </h2>
        <TreeActionButtons
          canCreate={canCreate}
          onCreateFolder={() => {
            hasSubmittedRef.current = false
            setCreatingFolder(true)
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
                  setCreatingFolder(false)
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
      <CreateMockApiDialog
        isOpen={dialog.isOpen}
        onClose={dialog.close}
        onCreate={dialog.onSubmit}
        workspaceId={workspaceId}
        parentPath={dialog.parentPath}
        editItem={dialog.editTarget}
      />
    </div>
  )
}
