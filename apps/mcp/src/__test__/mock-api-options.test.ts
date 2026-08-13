import { buildMockApiOptions } from "../mock-api-options"
import { DEFAULT_MOCK_PARAMS } from "@workspace/types"

describe("buildMockApiOptions", () => {
  it("이전 옵션이 없으면 전부 꺼진 상태에서 시작한다", () => {
    expect(buildMockApiOptions(null, {})).toEqual({ pagination: false })
  })

  it("sort를 지정하면 켜고 파라미터명을 저장한다", () => {
    const result = buildMockApiOptions(null, {
      sort: { sortParam: "_sort", orderParam: "_order" },
    })

    expect(result.sort).toBe(true)
    expect(result.sortParams).toEqual({ sortParam: "_sort", orderParam: "_order" })
  })

  it("search를 지정하면 켜고 파라미터명을 저장한다", () => {
    const result = buildMockApiOptions(null, { search: { searchParam: "q" } })

    expect(result.search).toBe(true)
    expect(result.searchParams).toEqual({ searchParam: "q" })
  })

  // 핵심 회귀: API가 options를 통째로 대체하므로 미지정 기능을 흘리면
  // 웹에서 켜 둔 설정이 MCP 갱신 한 번에 조용히 꺼진다.
  it("지정하지 않은 기능은 이전 값을 그대로 유지한다", () => {
    const previous = {
      pagination: true,
      paginationParams: { pageParam: "page", limitParam: "limit" },
      search: true,
      searchParams: { searchParam: "q" },
    }

    const result = buildMockApiOptions(previous, {
      sort: { sortParam: "_sort", orderParam: "_order" },
    })

    expect(result.pagination).toBe(true)
    expect(result.paginationParams).toEqual({ pageParam: "page", limitParam: "limit" })
    expect(result.search).toBe(true)
    expect(result.searchParams).toEqual({ searchParam: "q" })
    expect(result.sort).toBe(true)
  })

  it("disableSort: true면 정렬만 끄고 나머지는 건드리지 않는다", () => {
    const previous = {
      pagination: true,
      sort: true,
      sortParams: { sortParam: "_sort", orderParam: "_order" },
    }

    const result = buildMockApiOptions(previous, { disableSort: true })

    expect(result.sort).toBe(false)
    expect(result.pagination).toBe(true)
  })

  it("disableSearch: true면 전문검색만 끈다", () => {
    const result = buildMockApiOptions(
      { pagination: false, search: true, searchParams: { searchParam: "q" } },
      { disableSearch: true }
    )

    expect(result.search).toBe(false)
  })

  it("disablePagination: true면 페이지네이션만 끈다", () => {
    const result = buildMockApiOptions(
      { pagination: true, sort: true },
      { disablePagination: true }
    )

    expect(result.pagination).toBe(false)
    expect(result.sort).toBe(true)
  })

  // 켜기와 끄기를 동시에 준 것은 LLM의 모순된 입력이다. 켜기를 이긴 것으로 본다.
  it("켜기와 끄기를 동시에 지정하면 켜기가 이긴다", () => {
    const result = buildMockApiOptions(null, {
      sort: { sortParam: "_sort", orderParam: "_order" },
      disableSort: true,
    })

    expect(result.sort).toBe(true)
  })

  it("이전 옵션 객체를 변형(mutate)하지 않는다", () => {
    const previous = { pagination: true }

    buildMockApiOptions(previous, { disablePagination: true })

    expect(previous.pagination).toBe(true)
  })
})
