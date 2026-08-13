import { z } from "zod"
import { DEFAULT_MOCK_PARAMS, type MockApiOptions } from "@workspace/types"

export interface OptionArgs {
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
      "지정하면 페이지네이션을 켜고 파라미터명을 설정합니다. 생략하면 기존 설정을 유지합니다."
    ),
  sort: z
    .object({
      sortParam: z.string().default(DEFAULT_MOCK_PARAMS.sortParam),
      orderParam: z.string().default(DEFAULT_MOCK_PARAMS.orderParam),
    })
    .optional()
    .describe(
      `지정하면 정렬을 켭니다 (기본 ?${DEFAULT_MOCK_PARAMS.sortParam}=필드명&${DEFAULT_MOCK_PARAMS.orderParam}=asc|desc). 생략하면 기존 설정을 유지합니다.`
    ),
  search: z
    .object({
      searchParam: z.string().default(DEFAULT_MOCK_PARAMS.searchParam),
    })
    .optional()
    .describe(
      `지정하면 전문검색을 켭니다 (기본 ?${DEFAULT_MOCK_PARAMS.searchParam}=검색어). 생략하면 기존 설정을 유지합니다.`
    ),
} as const

/** update 전용 "끄기" shape — 끌 기존 값이 있는 갱신에서만 의미가 있다. */
export const mockApiDisableInputShape = {
  disablePagination: z
    .boolean()
    .optional()
    .describe("true일 때만 페이지네이션을 끕니다. 생략하면 기존 설정을 유지합니다."),
  disableSort: z
    .boolean()
    .optional()
    .describe("true일 때만 정렬을 끕니다. 생략하면 기존 설정을 유지합니다."),
  disableSearch: z
    .boolean()
    .optional()
    .describe("true일 때만 전문검색을 끕니다. 생략하면 기존 설정을 유지합니다."),
} as const
