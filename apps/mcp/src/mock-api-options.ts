import { z } from "zod"
import {
  DEFAULT_MOCK_PARAMS,
  type MockApiOptions,
  type MockResourceType,
} from "@workspace/types"

export interface OptionArgs {
  resourceType?: MockResourceType
  pagination?: { pageParam: string; limitParam: string }
  disablePagination?: boolean
  sort?: { sortParam: string; orderParam: string }
  disableSort?: boolean
  search?: { searchParam: string }
  disableSearch?: boolean
}

/**
 * 기존 옵션 위에 인자로 받은 변경만 얹는다.
 *
 * API의 updateItem은 options를 통째로 대체하므로, 지정하지 않은 기능은
 * 이전 값을 그대로 되돌려보내야 웹에서 켜 둔 설정이 꺼지지 않는다.
 *
 * 켜기(파라미터 객체)와 끄기(disable* 플래그)를 나눈 이유: boolean 하나로는
 * "미지정(=유지)"과 "false(=끄기)"를 구분할 수 없어, LLM이 옵션을 생략할
 * 때마다 사용자가 켜 둔 기능이 조용히 꺼진다.
 */
export function buildMockApiOptions(
  previous: MockApiOptions | null | undefined,
  args: OptionArgs
): MockApiOptions {
  const next: MockApiOptions = { ...(previous ?? { pagination: false }) }

  if (args.resourceType) {
    next.resourceType = args.resourceType
    if (args.resourceType === "object") {
      next.pagination = false
      next.sort = false
      next.search = false
      delete next.paginationParams
      delete next.sortParams
      delete next.searchParams
      return next
    }
  }

  if (args.pagination) {
    next.pagination = true
    next.paginationParams = args.pagination
  } else if (args.disablePagination) {
    next.pagination = false
  }

  if (args.sort) {
    next.sort = true
    next.sortParams = args.sort
  } else if (args.disableSort) {
    next.sort = false
  }

  if (args.search) {
    next.search = true
    next.searchParams = args.search
  } else if (args.disableSearch) {
    next.search = false
  }

  return next
}

/**
 * create/update 두 도구가 공유하는 "켜기" 입력 shape.
 * 기본 파라미터명은 @workspace/types의 DEFAULT_MOCK_PARAMS가 단독 소유한다 —
 * 여기에 문자열을 다시 적으면 목서버가 읽는 키와 조용히 어긋난다.
 */
export const mockApiOptionInputShape = {
  pagination: z
    .object({
      pageParam: z.string().default(DEFAULT_MOCK_PARAMS.pageParam),
      limitParam: z.string().default(DEFAULT_MOCK_PARAMS.limitParam),
    })
    .optional()
    .describe(
      `지정 시 페이지네이션을 활성화하고 쿼리 파라미터명을 설정합니다 (예: ?${DEFAULT_MOCK_PARAMS.pageParam}=1&${DEFAULT_MOCK_PARAMS.limitParam}=10, limit 최대 100). 생략 시 기존 설정을 유지합니다.`
    ),
  sort: z
    .object({
      sortParam: z.string().default(DEFAULT_MOCK_PARAMS.sortParam),
      orderParam: z.string().default(DEFAULT_MOCK_PARAMS.orderParam),
    })
    .optional()
    .describe(
      `지정 시 정렬 기능을 활성화합니다 (예: ?${DEFAULT_MOCK_PARAMS.sortParam}=<field>&${DEFAULT_MOCK_PARAMS.orderParam}=asc|desc). 생략 시 기존 설정을 유지합니다.`
    ),
  search: z
    .object({
      searchParam: z.string().default(DEFAULT_MOCK_PARAMS.searchParam),
    })
    .optional()
    .describe(
      `지정 시 전체 텍스트 검색을 활성화합니다 (예: ?${DEFAULT_MOCK_PARAMS.searchParam}=<query>). 생략 시 기존 설정을 유지합니다.`
    ),
} as const

/** update 전용 "끄기" shape — 끌 기존 값이 있는 갱신에서만 의미가 있다. */
export const mockApiDisableInputShape = {
  disablePagination: z
    .boolean()
    .optional()
    .describe("true로 지정할 때만 페이지네이션을 비활성화합니다. 생략 시 기존 설정을 유지합니다."),
  disableSort: z
    .boolean()
    .optional()
    .describe("true로 지정할 때만 정렬 기능을 비활성화합니다. 생략 시 기존 설정을 유지합니다."),
  disableSearch: z
    .boolean()
    .optional()
    .describe("true로 지정할 때만 전문검색을 비활성화합니다. 생략 시 기존 설정을 유지합니다."),
} as const
