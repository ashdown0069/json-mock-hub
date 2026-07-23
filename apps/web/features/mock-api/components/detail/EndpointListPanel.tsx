"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Check, Code2, Copy } from "lucide-react"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { FileItem } from "@/features/file-browser/types"
import { getMockApiBaseUrl } from "@/lib/mockApiUrl"
import { useWorkspaceBasePath } from "@/hooks/useWorkspaceBasePath"

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE"

interface EndpointListPanelProps {
  item: FileItem
  workspaceId: string
}

interface EndpointDef {
  method: HttpMethod
  url: string
  description: string
}

// 각 HTTP 메소드별 스타일 정의
const METHOD_STYLES: Record<HttpMethod, string> = {
  GET: "bg-emerald-100 text-emerald-700",
  POST: "bg-indigo-100 text-indigo-700",
  PUT: "bg-amber-100 text-amber-700",
  DELETE: "bg-rose-100 text-rose-700",
}

/**
 * 우측 CRUD 엔드포인트 목록 패널 컴포넌트입니다.
 * 각 엔드포인트의 URL 복사와 코드 생성 페이지(code) 이동 버튼을 제공합니다.
 */
export function EndpointListPanel({
  item,
  workspaceId,
}: EndpointListPanelProps) {
  const t = useTranslations("EndpointList")
  const base = getMockApiBaseUrl(workspaceId)

  // CodeGenPanel과 동일한 폴백을 사용해 두 화면의 URL을 일치시킨다
  const itemPath = item.path ?? `/${item.name}`

  // 페이지네이션 활성화 여부에 따라 URL 예시에 쿼리 파라미터를 추가합니다.
  const paginationQuery = item.options?.pagination
    ? `?${item.options.paginationParams?.pageParam ?? "page"}=1&${item.options.paginationParams?.limitParam ?? "limit"}=10`
    : ""

  // 지원하는 5대 REST API 엔드포인트 명세
  const endpoints: EndpointDef[] = [
    {
      method: "GET",
      url: `${base}${itemPath}${paginationQuery}`,
      description: t("descList"),
    },
    { method: "GET", url: `${base}${itemPath}/:id`, description: t("descGetOne") },
    { method: "POST", url: `${base}${itemPath}`, description: t("descCreate") },
    { method: "PUT", url: `${base}${itemPath}/:id`, description: t("descUpdate") },
    { method: "DELETE", url: `${base}${itemPath}/:id`, description: t("descDelete") },
  ]

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <h2 className="text-sm font-semibold text-slate-900">{t("heading")}</h2>
      <div className="flex flex-col gap-2">
        {endpoints.map((endpoint) => (
          <EndpointRow
            key={`${endpoint.method}-${endpoint.url}`}
            endpoint={endpoint}
          />
        ))}
      </div>
    </div>
  )
}

function EndpointRow({ endpoint }: { endpoint: EndpointDef }) {
  const router = useRouter()
  const { basePath } = useWorkspaceBasePath()
  const [copied, setCopied] = useState(false)
  const t = useTranslations("EndpointList")
  const tErrors = useTranslations("errors")

  // 엔드포인트 URL을 클립보드에 복사하는 핸들러
  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(endpoint.url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error(tErrors("copyFailed"))
    }
  }

  return (
    <div className="rounded-lg border bg-white p-3 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center gap-2">
        <Badge
          className={`w-16 justify-center font-mono text-xs ${METHOD_STYLES[endpoint.method]}`}
        >
          {endpoint.method}
        </Badge>
        <span
          className="min-w-0 flex-1 truncate font-mono text-xs text-slate-700"
          title={endpoint.url}
        >
          {endpoint.url}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        {/* 코드보기: 인라인 토글 대신 코드 생성 페이지로 이동합니다 */}
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => router.push(`${basePath}/code`)}
        >
          <Code2 size={12} className="mr-1" />
          {t("viewCode")}
        </Button>
        {/* URL 복사 버튼 */}
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={handleCopyUrl}
        >
          {copied ? (
            <Check size={12} className="mr-1 text-emerald-600" />
          ) : (
            <Copy size={12} className="mr-1" />
          )}
          {t("copy")}
        </Button>
        <span className="ml-auto text-xs font-medium text-slate-400">
          {endpoint.description}
        </span>
      </div>
    </div>
  )
}
