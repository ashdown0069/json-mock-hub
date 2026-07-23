"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { FileItem } from "@/features/file-browser/types"
import { useCreateBrowserItem } from "@/features/file-browser/api/createBrowserItem"
import { useUpdateBrowserItem } from "@/features/file-browser/api/updateBrowserItem"
import { useFileBrowser } from "@/features/file-browser/store/useFileBrowser"
import { customAxiosError } from "@/lib/axios"
import { CreateMockApiPayload } from "../types"
import { useCreateMockApiStore } from "../store/useCreateMockApiStore"
import { buildHydrationState } from "../lib/hydrateFromItem"

// Mock API 생성 다이얼로그가 열릴 때의 생성 위치(부모 폴더) 정보
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

// Mock API 생성/수정 다이얼로그의 상태와 제출 로직을 담당하는 훅
export function useMockApiDialog(workspaceId: string, basePath: string) {
  const router = useRouter()
  const [dialogParent, setDialogParent] = useState<DialogParent | null>(null)
  const [editTarget, setEditTarget] = useState<FileItem | null>(null)

  const { mutate: createItem } = useCreateBrowserItem(workspaceId)
  const { mutate: updateItem } = useUpdateBrowserItem(workspaceId)
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
          setActiveItem(created.id)
          toast.success("Mock API가 생성되었습니다.")
          // 성공했을 때만 다이얼로그를 닫고 폼 스토어를 초기화합니다.
          setDialogParent(null)
          resetCreateForm()
          // 생성 직후 상세 패널이 보이도록 apis 페이지로 이동합니다.
          router.push(`${basePath}/apis`)
        },
        onError: (error) => {
          const axiosError = error as customAxiosError
          toast.error(
            axiosError.response?.data?.message ?? "Mock API 생성에 실패했습니다.",
            { position: "top-center" }
          )
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
          toast.success("Mock API가 수정되었습니다.")
          // 성공했을 때만 닫고 초기화 (create와 동일 패턴 — 실패 시 폼 유지)
          setEditTarget(null)
          resetCreateForm()
        },
        onError: (error) => {
          const axiosError = error as customAxiosError
          toast.error(
            axiosError.response?.data?.message ?? "Mock API 수정에 실패했습니다.",
            { position: "top-center" }
          )
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
