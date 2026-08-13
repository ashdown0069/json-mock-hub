"use client"

import dynamic from "next/dynamic"
import { Database } from "lucide-react"
import { useTranslations } from "next-intl"
import { useSelectedFile } from "@/features/mock-api/hooks/useSelectedFile"

// 상세 패널은 트리에서 파일을 고른 뒤에만 필요하다. 정적 import로 두면
// /apis에 들어오기만 해도 코드 하이라이터·엔드포인트 목록까지 함께 내려받는다.
const MockApiDetailPanel = dynamic(
  () =>
    import("@/features/mock-api/components/detail/MockApiDetailPanel").then(
      (mod) => mod.MockApiDetailPanel,
    ),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-64 animate-pulse rounded-xl border border-slate-200 bg-white"
        aria-hidden="true"
      />
    ),
  },
)

export function ApisClient() {
  const t = useTranslations("WorkspacePages")
  const { item } = useSelectedFile()

  return (
    <div className="min-h-full flex-1 bg-slate-50/50 p-8">
      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">{t("apisTitle")}</h1>
      </div>

      {/* 선택된 파일이 존재하면 JSON 미리보기 + CRUD 엔드포인트를 렌더링하고, 없으면 Empty State를 노출합니다. */}
      {item ? (
        <MockApiDetailPanel />
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
