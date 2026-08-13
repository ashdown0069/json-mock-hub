"use client"

import { resolveMockApiParams } from "@workspace/types"
import { useGetEffectiveJson } from "@/features/mock-api/api/getEffectiveJson"
import { useMockStateSSE } from "@/features/mock-api/hooks/useMockStateSSE"
import { useSelectedFile } from "../../hooks/useSelectedFile"
import { CodeBlock } from "./CodeBlock"
import { FeatureBadge } from "./FeatureBadge"

/**
 * 선택한 Mock API 파일의 현재 유효 상태(base JSON + Redis 오버레이)를 보여준다.
 * useMockStateSSE가 수신한 변경 신호에 따라 자동으로 최신 값으로 갱신된다.
 * 서버 응답이 오기 전에는 item.json을 placeholder로 즉시 보여준다.
 */
export function JsonPreviewPanel() {
  const { item, workspaceId } = useSelectedFile()

  // 이 패널이 살아있는 동안만 mock 상태 변경 SSE를 구독해 effectiveJson 캐시를 무효화한다.
  useMockStateSSE(workspaceId)

  // Rules of Hooks: item이 없어도 훅 호출 순서를 지키기 위해 안전한 폴백 값을 쓴다.
  // useGetEffectiveJson은 path가 비어 있으면 enabled: false로 요청을 보내지 않는다.
  const basePlaceholder =
    item && Array.isArray(item.json) ? (item.json as unknown[]) : []
  const path = item ? (item.path ?? `/${item.name}`) : ""
  const { data: effectiveJson = basePlaceholder } = useGetEffectiveJson(
    workspaceId,
    path,
    basePlaceholder
  )

  if (!item) return null

  const jsonText = JSON.stringify(effectiveJson, null, 2)
  const params = resolveMockApiParams(item.options)

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <h2 className="text-sm font-semibold text-slate-900">Response JSON</h2>
        <div className="flex flex-wrap gap-1.5">
          {params.pagination && (
            <FeatureBadge
              variant="pagination"
              label="Pagination"
              params={`${params.pagination.pageParam} / ${params.pagination.limitParam}`}
            />
          )}
          {params.sort && (
            <FeatureBadge
              variant="sort"
              label="Sort"
              params={`${params.sort.sortParam} / ${params.sort.orderParam}`}
            />
          )}
          {params.search && (
            <FeatureBadge
              variant="search"
              label="Search"
              params={params.search.searchParam}
            />
          )}
        </div>
      </div>

      <CodeBlock code={jsonText} lang="json" className="max-h-[560px]" />
    </div>
  )
}
