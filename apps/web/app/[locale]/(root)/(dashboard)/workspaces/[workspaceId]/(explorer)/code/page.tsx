"use client"

import dynamic from "next/dynamic"
import { CodeXml } from "lucide-react"
import { useTranslations } from "next-intl"
import { useSelectedFile } from "@/features/mock-api/hooks/useSelectedFile"

// 코드 생성 패널은 트리에서 파일을 고른 뒤에만 필요하다. 정적 import로 두면
// /code에 들어오기만 해도 코드젠 스니펫 빌더와 하이라이터를 함께 내려받는다.
const CodeGenPanel = dynamic(
  () =>
    import("@/features/code-gen/components/CodeGenPanel").then(
      (mod) => mod.CodeGenPanel,
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

export default function CodePage() {
  const t = useTranslations("WorkspacePages")
  const { item } = useSelectedFile()

  return (
    <div className="min-h-full flex-1 bg-slate-50/50 p-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <CodeXml size={24} />
          {t("codeTitle")}
        </h1>
      </div>

      {item ? (
        <CodeGenPanel />
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
