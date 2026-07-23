import { FileItem } from "@/features/file-browser/types"
import { schemaToFields } from "@workspace/mockgen/convertSchema"

// 수정 다이얼로그를 열 때 기존 아이템으로부터 폼 스토어 초기 상태를 계산한다
export function buildHydrationState(item: FileItem) {
  return {
    apiPath: item.name,
    // fieldDefs가 있으면 faker 선택값까지 복원, 레거시 문서는 schema 역변환 폴백
    fields: item.fieldDefs ?? schemaToFields(item.schema),
    // GenerationOptions 슬라이더 범위(1~50)로 clamp
    itemCount: [
      Math.min(50, Math.max(1, Array.isArray(item.json) ? item.json.length : 10)),
    ],
    enablePagination: item.options?.pagination ?? false,
    pageParam: item.options?.paginationParams?.pageParam ?? "page",
    limitParam: item.options?.paginationParams?.limitParam ?? "limit",
  }
}
