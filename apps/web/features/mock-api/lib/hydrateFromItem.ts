import { FileItem } from "@/features/file-browser/types"
import {
  normalizeFieldDefs,
  schemaToFields,
} from "@workspace/mockgen/convertSchema"
import { resolveMockApiParams, DEFAULT_MOCK_PARAMS } from "@workspace/types"

// 수정 다이얼로그를 열 때 기존 아이템으로부터 폼 스토어 초기 상태를 계산한다
export function buildHydrationState(item: FileItem) {
  // 예약 필드 id는 에디터에 노출하지 않는다 (잠금 행으로 별도 표시).
  // fieldDefs는 무검증 저장이라 지원하지 않는 타입이 섞여 있을 수 있다. 걸러내지
  // 않으면 타입 셀렉트가 빈칸으로 뜨고, 그대로 저장 시 목데이터가 null이 된다.
  const fields = normalizeFieldDefs(
    item.fieldDefs ?? schemaToFields(item.schema)
  ).filter((f) => f.name !== "id")
  // 기본 파라미터명은 @workspace/types가 소유한다. 여기서 다시 ?? "page"를 쓰면
  // 목서버 런타임·생성 코드와 어긋나도 폼에서는 정상으로 보인다.
  const params = resolveMockApiParams(item.options)
  return {
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
