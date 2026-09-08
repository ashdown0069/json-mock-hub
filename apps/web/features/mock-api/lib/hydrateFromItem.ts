import { FileItem } from "@/features/file-browser/types"
import { normalizeFields } from "@workspace/mockgen/convertSchema"
import { resolveMockApiParams, DEFAULT_MOCK_PARAMS } from "@workspace/types"

// 수정 다이얼로그를 열 때 기존 아이템으로부터 폼 스토어 초기 상태를 계산한다
export function buildHydrationState(item: FileItem) {
  const params = resolveMockApiParams(item.options)
  const isObject = params.resourceType === "object"

  // 단일 객체 모드에서는 사용자가 정의한 id를 보존하고, 컬렉션 모드에서는 시스템 id를 에디터에서 숨긴다
  const allFields = normalizeFields(item.fields ?? [])
  const fields = isObject ? allFields : allFields.filter((f) => f.name !== "id")

  return {
    resourceType: params.resourceType,
    apiPath: item.name,
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
