import type { MockApiOptions } from "./schema"

/**
 * 목서버 실행 파라미터의 기본 이름 (단일 진실 원천).
 *
 * 이 문자열은 세 곳에서 동시에 계약이다 —
 *   (1) apps/api 목서버 런타임이 req.query에서 읽는 키
 *   (2) packages/codegen이 생성 코드에 박아 넣는 키
 *   (3) apps/web·apps/mcp가 사용자에게 보여주는 키
 * 한 곳만 바꾸면 나머지는 컴파일도 되고 테스트도 통과하면서 런타임에서만
 * 조용히 어긋난다(예: q → search로 바꾸면 검색이 무시된다).
 */
export const DEFAULT_MOCK_PARAMS = {
  pageParam: "page",
  limitParam: "limit",
  sortParam: "_sort",
  orderParam: "_order",
  searchParam: "q",
} as const

/** 기능별 파라미터명이 해석된 결과. 기능이 꺼져 있으면 null. */
export interface ResolvedMockParams {
  pagination: { pageParam: string; limitParam: string } | null
  sort: { sortParam: string; orderParam: string } | null
  search: { searchParam: string } | null
}

/** 저장된 파라미터명이 비어 있으면 기본값으로 대체한다. */
const orDefault = (value: string | undefined, fallback: string): string =>
  value && value.trim() !== "" ? value : fallback

/**
 * MockApiOptions(저장 형태) → 실행 파라미터(런타임/생성 코드 형태).
 *
 * 기능 플래그가 false면 파라미터명이 저장돼 있어도 null이다 — 켜져 있지 않은
 * 기능의 파라미터를 생성 코드에 넣으면 동작하지 않는 인자가 노출된다.
 */
export function resolveMockApiParams(
  options: MockApiOptions | null | undefined,
): ResolvedMockParams {
  return {
    pagination: options?.pagination
      ? {
          pageParam: orDefault(
            options.paginationParams?.pageParam,
            DEFAULT_MOCK_PARAMS.pageParam,
          ),
          limitParam: orDefault(
            options.paginationParams?.limitParam,
            DEFAULT_MOCK_PARAMS.limitParam,
          ),
        }
      : null,
    sort: options?.sort
      ? {
          sortParam: orDefault(
            options.sortParams?.sortParam,
            DEFAULT_MOCK_PARAMS.sortParam,
          ),
          orderParam: orDefault(
            options.sortParams?.orderParam,
            DEFAULT_MOCK_PARAMS.orderParam,
          ),
        }
      : null,
    search: options?.search
      ? {
          searchParam: orDefault(
            options.searchParams?.searchParam,
            DEFAULT_MOCK_PARAMS.searchParam,
          ),
        }
      : null,
  }
}

/**
 * 페이지네이션 응답 메타.
 *
 * apps/api의 목서버가 실제로 반환하는 형태이자, packages/codegen이 문자열
 * 템플릿으로 생성하는 인터페이스다. 필드 하나가 어긋나면 생성 코드는
 * 컴파일되고 api 테스트도 통과하지만 런타임에만 드러난다.
 */
export interface PaginationMeta {
  page: number
  limit: number
  totalItems: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}
