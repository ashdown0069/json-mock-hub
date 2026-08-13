import {
  DEFAULT_MOCK_PARAMS,
  resolveMockApiParams,
} from "../mockContract"

describe("DEFAULT_MOCK_PARAMS", () => {
  it("목서버 런타임이 읽는 키와 생성 코드가 박는 키를 고정한다", () => {
    // 이 값을 바꾸면 3개 앱의 동작이 동시에 바뀐다.
    // 테스트가 값을 못박는 것은 "무심코 바꿀 수 없게" 하려는 것이다.
    expect(DEFAULT_MOCK_PARAMS).toEqual({
      pageParam: "page",
      limitParam: "limit",
      sortParam: "_sort",
      orderParam: "_order",
      searchParam: "q",
    })
  })
})

describe("resolveMockApiParams", () => {
  it("options가 없으면 모든 기능이 null이다", () => {
    expect(resolveMockApiParams(null)).toEqual({
      pagination: null,
      sort: null,
      search: null,
    })
    expect(resolveMockApiParams(undefined)).toEqual({
      pagination: null,
      sort: null,
      search: null,
    })
  })

  it("기능이 켜져 있고 파라미터명이 없으면 기본값을 채운다", () => {
    expect(
      resolveMockApiParams({ pagination: true, sort: true, search: true }),
    ).toEqual({
      pagination: { pageParam: "page", limitParam: "limit" },
      sort: { sortParam: "_sort", orderParam: "_order" },
      search: { searchParam: "q" },
    })
  })

  it("지정된 파라미터명을 우선한다", () => {
    expect(
      resolveMockApiParams({
        pagination: true,
        paginationParams: { pageParam: "p", limitParam: "size" },
        sort: true,
        sortParams: { sortParam: "orderBy", orderParam: "dir" },
        search: true,
        searchParams: { searchParam: "keyword" },
      }),
    ).toEqual({
      pagination: { pageParam: "p", limitParam: "size" },
      sort: { sortParam: "orderBy", orderParam: "dir" },
      search: { searchParam: "keyword" },
    })
  })

  it("빈 문자열 파라미터명은 기본값으로 대체한다", () => {
    // 웹 폼이 입력을 지우면 ""가 저장될 수 있다. ""를 그대로 쓰면
    // query[""]를 읽어 항상 undefined가 되고 기능이 조용히 죽는다.
    expect(
      resolveMockApiParams({
        pagination: true,
        paginationParams: { pageParam: "", limitParam: "" },
      }).pagination,
    ).toEqual({ pageParam: "page", limitParam: "limit" })
  })

  it("기능이 꺼져 있으면 파라미터명이 있어도 null이다", () => {
    expect(
      resolveMockApiParams({
        pagination: false,
        paginationParams: { pageParam: "p", limitParam: "size" },
      }).pagination,
    ).toBeNull()
  })
})
