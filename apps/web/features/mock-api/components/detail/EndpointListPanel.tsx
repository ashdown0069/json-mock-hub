"use client"

import { useBoolean, useCopyToClipboard, useTimeout } from "usehooks-ts"
import { useRouter } from "@/i18n/routing"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Check, Code2, Copy, RotateCcw } from "lucide-react"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { resolveMockApiParams } from "@workspace/types"
import { getMockApiBaseUrl } from "@/lib/mockApiUrl"
import { useWorkspaceBasePath } from "@/hooks/useWorkspaceBasePath"
import { ConfirmDialog } from "@/components/ConfirmDialog"
import { useResetMockState } from "@/features/mock-api/api/resetMockState"
import { schemaToFields } from "@workspace/mockgen/convertSchema"
import { CodeBlock } from "./CodeBlock"
import { useSelectedFile } from "../../hooks/useSelectedFile"

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"

interface EndpointDef {
  method: HttpMethod
  url: string
  description: string
}

const METHOD_STYLES: Record<HttpMethod, string> = {
  GET: "bg-emerald-100 text-emerald-700",
  POST: "bg-indigo-100 text-indigo-700",
  PUT: "bg-amber-100 text-amber-700",
  PATCH: "bg-violet-100 text-violet-700",
  DELETE: "bg-rose-100 text-rose-700",
}

/** 복사 완료 체크 아이콘이 유지되는 시간(ms) */
const COPIED_RESET_MS = 1500

export function EndpointListPanel() {
  const { item, workspaceId } = useSelectedFile()
  const router = useRouter()
  const { basePath } = useWorkspaceBasePath()
  const t = useTranslations("EndpointList")
  const { value: confirmOpen, setValue: setConfirmOpen } = useBoolean(false)
  const resetState = useResetMockState(workspaceId)

  if (!item) return null

  const base = getMockApiBaseUrl(workspaceId)
  // CodeGenPanel과 동일한 폴백을 사용해 두 화면의 URL을 일치시킨다
  const itemPath = item.path ?? `/${item.name}`

  const params = resolveMockApiParams(item.options)

  const paginationQuery = params.pagination
    ? `?${params.pagination.pageParam}=1&${params.pagination.limitParam}=10`
    : ""

  const sortHint = params.sort
    ? t("queryHintSort", {
        sortParam: params.sort.sortParam,
        orderParam: params.sort.orderParam,
        field: "{field}",
      })
    : null
  const searchHint = params.search
    ? t("queryHintSearch", {
        searchParam: params.search.searchParam,
      })
    : null

  // hydrateFromItem.ts와 동일한 패턴: id는 서버가 관리하므로 바디 예시에서 제외한다
  const bodyFields = (item.fieldDefs ?? schemaToFields(item.schema)).filter(
    (f) => f.name !== "id",
  )
  const bodyTemplate = Object.fromEntries(bodyFields.map((f) => [f.name, ""]))
  const bodyText = JSON.stringify(bodyTemplate, null, 2)

  const endpoints: EndpointDef[] = [
    {
      method: "GET",
      url: `${base}${itemPath}${paginationQuery}`,
      description: t("descList"),
    },
    { method: "GET", url: `${base}${itemPath}/:id`, description: t("descGetOne") },
    { method: "POST", url: `${base}${itemPath}`, description: t("descCreate") },
    { method: "PUT", url: `${base}${itemPath}/:id`, description: t("descUpdate") },
    { method: "PATCH", url: `${base}${itemPath}/:id`, description: t("descPatch") },
    { method: "DELETE", url: `${base}${itemPath}/:id`, description: t("descDelete") },
  ]

  const handleConfirmReset = () => {
    resetState.mutate(
      { itemId: item.id },
      {
        onSuccess: () => {
          toast.success(t("resetSuccess"))
          setConfirmOpen(false)
        },
        onError: () => setConfirmOpen(false),
      },
    )
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900">{t("heading")}</h2>
        <div className="flex shrink-0 items-center gap-2">
          {/* 엔드포인트 5행이 모두 같은 /code로 이동했으므로 패널 헤더에 1개만 둔다 */}
          <Button
            size="sm"
            className="h-7 cursor-pointer text-xs"
            onClick={() => router.push(`${basePath}/code`)}
          >
            <Code2 size={12} className="mr-1" />
            {t("viewCode")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 cursor-pointer text-xs"
            onClick={() => setConfirmOpen(true)}
          >
            <RotateCcw size={12} className="mr-1" />
            {t("resetState")}
          </Button>
        </div>
      </div>

      <p className="text-xs text-slate-400">{t("statefulNote")}</p>

      <div className="flex flex-col gap-2">
        {endpoints.map((endpoint) => (
          <EndpointRow
            key={`${endpoint.method}-${endpoint.url}`}
            endpoint={endpoint}
          />
        ))}
      </div>

      <div className="flex flex-col gap-1">
        <h3 className="text-xs font-semibold text-slate-700">
          {t("requestBodyTitle")}
        </h3>
        <CodeBlock code={bodyText} lang="json" className="max-h-64" />
      </div>

      {/* GET 목록에서 사용 가능한 쿼리 파라미터 안내 (활성화된 기능만) */}
      {(sortHint || searchHint) && (
        <div className="mt-2 rounded-lg border bg-slate-50 p-3">
          <h3 className="mb-1 text-xs font-semibold text-slate-700">
            {t("queryHintTitle")}
          </h3>
          <ul className="flex flex-col gap-0.5 font-mono text-[11px] text-slate-500">
            {sortHint && <li>{sortHint}</li>}
            {searchHint && <li>{searchHint}</li>}
          </ul>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("resetConfirmTitle")}
        description={t("resetConfirmDesc")}
        confirmText={t("resetConfirm")}
        cancelText={t("cancel")}
        onConfirm={handleConfirmReset}
        isLoading={resetState.isPending}
      />
    </div>
  )
}

function EndpointRow({ endpoint }: { endpoint: EndpointDef }) {
  const {
    value: copied,
    setTrue: markCopied,
    setFalse: clearCopied,
  } = useBoolean(false)
  const [, copyToClipboard] = useCopyToClipboard()
  const t = useTranslations("EndpointList")
  const tErrors = useTranslations("errors")

  // delay가 null이면 타이머를 예약하지 않는다. 언마운트 시 clearTimeout이 보장된다.
  useTimeout(clearCopied, copied ? COPIED_RESET_MS : null)

  const handleCopyUrl = async () => {
    // useCopyToClipboard는 예외를 던지지 않고 성공 여부를 boolean으로 돌려준다.
    if (await copyToClipboard(endpoint.url)) {
      markCopied()
    } else {
      toast.error(tErrors("copyFailed"))
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-white p-3 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center gap-2">
        <Badge
          className={`w-16 justify-center font-mono text-xs ${METHOD_STYLES[endpoint.method]}`}
        >
          {endpoint.method}
        </Badge>
        <span className="flex-1 text-xs font-medium text-slate-500">
          {endpoint.description}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="h-7 shrink-0 cursor-pointer text-xs"
          onClick={handleCopyUrl}
        >
          {copied ? (
            <Check size={12} className="mr-1 text-emerald-600" />
          ) : (
            <Copy size={12} className="mr-1" />
          )}
          {t("copy")}
        </Button>
      </div>

      <code className="block rounded-md bg-slate-50 px-2.5 py-1.5 font-mono text-xs leading-relaxed break-all text-slate-700">
        {endpoint.url}
      </code>
    </div>
  )
}
