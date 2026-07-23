"use client"

import { FileItem } from "@/features/file-browser/types"
import { CodeBlock } from "./CodeBlock"

interface JsonPreviewPanelProps {
  item: FileItem
}

/**
 * 좌측 JSON 미리보기 패널 컴포넌트입니다.
 * 선택한 Mock API 파일의 JSON 더미 데이터를 보기 좋게 정렬하여 표시하고,
 * 페이지네이션 설정 유무에 따라 뱃지 및 결과 포맷 안내 문구를 렌더링합니다.
 */
export function JsonPreviewPanel({ item }: JsonPreviewPanelProps) {
  // item.json이 존재하면 개행 및 들여쓰기를 적용해 직렬화합니다.
  const jsonText = JSON.stringify(item.json ?? [], null, 2)

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Response JSON</h2>
        {/* 페이지네이션이 설정되어 있는 경우 활성화 상태 뱃지를 노출합니다. */}
        {item.options?.pagination && (
          <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs text-indigo-600 font-medium">
            Pagination: {item.options.paginationParams?.pageParam ?? "page"} /{" "}
            {item.options.paginationParams?.limitParam ?? "limit"}
          </span>
        )}
      </div>
      
      {/* CodeBlock 컴포넌트를 사용해 구문 하이라이트와 클립보드 복사 기능을 제공합니다. */}
      <CodeBlock code={jsonText} lang="json" className="max-h-[560px]" />
      
      {/* 페이지네이션 응답 형태에 관한 안내 문구 */}
      {item.options?.pagination && (
        <p className="text-xs text-slate-500 mt-1">
          페이지네이션이 활성화되어 실제 GET 응답은{" "}
          <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-indigo-600">
            {"{ data: [...], meta: { page, limit, totalItems, totalPages, hasNext, hasPrev } }"}
          </code>{" "}
          형태로 래핑됩니다.
        </p>
      )}
    </div>
  )
}
