"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "@/i18n/routing"
import { toast } from "sonner"
import { FileItem } from "@/features/file-browser/types"
import { useCreateBrowserItem } from "@/features/file-browser/api/createBrowserItem"
import { useUpdateBrowserItem } from "@/features/file-browser/api/updateBrowserItem"
import { useFileBrowser } from "@/features/file-browser/store/useFileBrowser"
import { CreateMockApiPayload } from "../types"
import { useCreateMockApiStore } from "../store/useCreateMockApiStore"
import { buildHydrationState } from "../lib/hydrateFromItem"

interface DialogParent {
  id: string | null
  path: string
}

// "/users/list" → "/users", "/list" → "/"
export function parentPathOf(path?: string) {
  if (!path) return "/"
  const idx = path.lastIndexOf("/")
  return idx <= 0 ? "/" : path.slice(0, idx)
}

export function useMockApiDialog(workspaceId: string, basePath: string) {
  const router = useRouter()
  const t = useTranslations("MockApiDialog")
  const [dialogParent, setDialogParent] = useState<DialogParent | null>(null)
  const [editTarget, setEditTarget] = useState<FileItem | null>(null)

  const { mutate: createItem } = useCreateBrowserItem(workspaceId, {
    defaultMsg: t("createFailed"),
  })
  const { mutate: updateItem } = useUpdateBrowserItem(workspaceId, {
    defaultMsg: t("updateFailed"),
  })
  const setActiveItem = useFileBrowser((state) => state.setActiveItem)
  const resetCreateForm = useCreateMockApiStore((state) => state.reset)
  const hydrate = useCreateMockApiStore((state) => state.hydrate)

  const openCreate = (parentId: string | null, parentPath: string) =>
    setDialogParent({ id: parentId, path: parentPath })

  const openEdit = (item: FileItem) => {
    hydrate(buildHydrationState(item))
    setEditTarget(item)
  }

  const close = () => {
    setDialogParent(null)
    setEditTarget(null)
  }

  const createMockApi = (payload: CreateMockApiPayload) => {
    if (!dialogParent) return

    createItem(
      { ...payload, itemType: "File", parentId: dialogParent.id },
      {
        onSuccess: (created) => {
          setActiveItem(created._id)
          toast.success(t("createSuccess"))
          // 실패 시에는 폼을 유지해 재시도할 수 있게 하고, 성공 시에만 닫는다
          setDialogParent(null)
          resetCreateForm()
          router.push(`${basePath}/apis`)
        },
      }
    )
  }

  const updateMockApi = (payload: CreateMockApiPayload) => {
    if (!editTarget) return
    updateItem(
      {
        ...payload,
        itemType: "File",
        parentId: editTarget.parentId ?? null,
        itemId: editTarget.id,
      },
      {
        onSuccess: () => {
          toast.success(t("updateSuccess"))
          // 실패 시 폼을 유지해 재시도 가능 (create와 동일 패턴)
          setEditTarget(null)
          resetCreateForm()
        },
      }
    )
  }

  return {
    isOpen: dialogParent !== null || editTarget !== null,
    editTarget,
    parentPath: editTarget
      ? parentPathOf(editTarget.path)
      : (dialogParent?.path ?? "/"),
    openCreate,
    openEdit,
    close,
    onSubmit: editTarget ? updateMockApi : createMockApi,
  }
}
