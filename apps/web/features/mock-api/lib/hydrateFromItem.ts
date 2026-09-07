import { FileItem } from "@/features/file-browser/types"
import {
  normalizeFieldDefs,
  schemaToFields,
} from "@workspace/mockgen/convertSchema"
import { resolveMockApiParams, DEFAULT_MOCK_PARAMS } from "@workspace/types"

// 수정 다이얼로그를 열 때 기존 아이템으로부터 폼 스토어 초기 상태를 계산한다
export function buildHydrationState(item: FileItem) {
  const params = resolveMockApiParams(item.options)
  const isObject = params.resourceType === "object"

  // 컬렉션 모드에서는 예약 필드 id를 에디터에 노출하지 않는다 (잠금 행으로 별도 표시).
  // 단일 객체 모드에서는 사용자가 정의한 id 필드가 실제 스키마 속성이므로 보존한다.
  const allFields = normalizeFieldDefs(
    item.fieldDefs ?? schemaToFields(item.schema)
  )
  const fields = isObject ? allFields : allFields.filter((f) => f.name !== "id")

  return {
    resourceType: params.resourceType,
    apiPath: item.name,
    // fieldDefs가 있으면 faker 선택값까지 복원, 레거시 문서는 schema 역변환 폴백
    fields,
    // GenerationOptions 슬라이더 범위(1~50)로 clamp
    itemCount: [
      Math.min(50, Math.max(1, Array.isArray(item.json) ? item.json.length : 10)),
    ],
    enablePagination: item.options?.pagination ?? false,
    pageParam: params.pagination?.pageParam ?? DEFAULT_MOCK_PARAMS.pageParam,
    limitParam: params.pagination?.limitParam ?? DEFAULT_MOCK_PARAMS.limitParam,
    enableSort: item.options?.sort ?? false,
    sortParam: params.sort?.sortParam ?? DEFAULT_MOCK_PARAMS.sortParam,
    orderParam: params.sort?.orderParam ?? DEFAULT_MOCK_PARAMS.orderParam,
    enableSearch: item.options?.search ?? false,
    searchParam: params.search?.searchParam ?? DEFAULT_MOCK_PARAMS.searchParam,
  }
}
