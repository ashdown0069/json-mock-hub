"use client"

import { useParams } from "next/navigation"
import { Database } from "lucide-react"
import { useTranslations } from "next-intl"
import { MockApiDetailPanel } from "@/features/mock-api/components/detail/MockApiDetailPanel"
import { useFileBrowser } from "@/features/file-browser/store/useFileBrowser"
import { useGetBrowserItems } from "@/features/file-browser/api/getBrowserItems"

export function ApisClient() {
  const t = useTranslations("WorkspacePages")
  const params = useParams()
  const workspaceId = params.workspaceId as string

  // 워크스페이스 내 브라우저 아이템(폴더/파일) 목록을 가져옵니다. (HydrationBoundary를 통해 초기 데이터 채워짐)
  const { data: items = [] } = useGetBrowserItems(workspaceId)
  // 전역 zustand 스토어로부터 선택된 파일(activeItem)의 ID를 가져옵니다.
  const activeItem = useFileBrowser((state) => state.activeItem)

  // 트리에서 선택된 항목이 File일 때만 상세 패널을 노출합니다.
  const selectedFile = items.find(
    (item) => item.id === activeItem && item.itemType === "File"
  )

  return (
    <div className="min-h-full flex-1 bg-slate-50/50 p-8">
      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">{t("apisTitle")}</h1>
      </div>

      {/* 선택된 파일이 존재하면 JSON 미리보기 + CRUD 엔드포인트를 렌더링하고, 없으면 Empty State를 노출합니다. */}
      {selectedFile ? (
        <MockApiDetailPanel item={selectedFile} workspaceId={workspaceId} />
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white py-24 shadow-sm">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100">
            <Database className="text-slate-500" size={24} />
          </div>
          <h3 className="mb-1 text-lg font-semibold text-slate-900">
            {t("emptyTitle")}
          </h3>
          <p className="max-w-sm text-center text-sm text-slate-500">
            {t("apisEmptyDesc")}
          </p>
        </div>
      )}
    </div>
  )
}
