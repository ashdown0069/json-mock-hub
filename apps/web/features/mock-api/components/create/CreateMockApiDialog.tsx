import React from "react"
import { useTranslations } from "next-intl"
import { CreateMockApiPayload } from "../../types"
import { FileItem } from "@/features/file-browser/types"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { useCreateMockApiStore } from "../../store/useCreateMockApiStore"
import { getMockApiBaseUrl } from "@/lib/mockApiUrl"
import { SchemaBuilderTab } from "./SchemaBuilderTab"

interface CreateMockApiDialogProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (payload: CreateMockApiPayload) => void
  workspaceId: string
  /** 생성 위치 부모 폴더의 전체 경로 (루트는 "/") */
  parentPath?: string
  editItem?: FileItem | null
}

export function CreateMockApiDialog({
  isOpen,
  onClose,
  onCreate,
  workspaceId,
  parentPath = "/",
  editItem = null,
}: CreateMockApiDialogProps) {
  const t = useTranslations("MockApiDialog")
  const reset = useCreateMockApiStore((state) => state.reset)

  // 실제 호출 가능한 엔드포인트 접두어 = 목서버 BaseURL + 부모 폴더 경로
  const endpointPrefix = `${getMockApiBaseUrl(workspaceId)}${
    parentPath === "/" ? "" : parentPath
  }/`

  const handleClose = () => {
    reset()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="border-b border-border p-6">
          <DialogTitle>{editItem ? t("titleEdit") : t("titleCreate")}</DialogTitle>
        </DialogHeader>
        <SchemaBuilderTab
          onClose={handleClose}
          onCreate={onCreate}
          endpointPrefix={endpointPrefix}
          submitLabel={editItem ? t("submitEdit") : t("submitCreate")}
        />
      </DialogContent>
    </Dialog>
  )
}
