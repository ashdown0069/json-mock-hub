"use client"

import { useParams } from "next/navigation"
import { CodeXml } from "lucide-react"
import { useTranslations } from "next-intl"
import { useFileBrowser } from "@/features/file-browser/store/useFileBrowser"
import { useGetBrowserItems } from "@/features/file-browser/api/getBrowserItems"
import { CodeGenPanel } from "@/features/code-gen/components/CodeGenPanel"

export default function CodePage() {
  const t = useTranslations("WorkspacePages")
  const params = useParams()
  const workspaceId = params.workspaceId as string

  const { data: items = [] } = useGetBrowserItems(workspaceId)
  const activeItem = useFileBrowser((state) => state.activeItem)

  // 좌측 트리에서 선택된 항목이 File일 때만 코드 생성 패널을 노출합니다.
  const selectedFile = items.find(
    (item) => item.id === activeItem && item.itemType === "File"
  )

  return (
    <div className="min-h-full flex-1 bg-slate-50/50 p-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <CodeXml size={24} />
          {t("codeTitle")}
        </h1>
      </div>

      {selectedFile ? (
        <CodeGenPanel item={selectedFile} workspaceId={workspaceId} />
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white py-24 shadow-sm">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100">
            <CodeXml className="text-slate-500" size={24} />
          </div>
          <h3 className="mb-1 text-lg font-semibold text-slate-900">
            {t("emptyTitle")}
          </h3>
          <p className="max-w-sm text-center text-sm text-slate-500">
            {t("codeEmptyDesc")}
          </p>
        </div>
      )}
    </div>
  )
}
