import { listSignature } from "../listSignature"
import type { CodeGenContext } from "../types"

const base: CodeGenContext = {
  resourceName: "users",
  typeName: "Users",
  baseUrl: "http://ws1.localhost:3000/api",
  resourcePath: "/users",
  schema: { id: "number" },
  pagination: null,
  sort: null,
  search: null,
}

const paging = { pageParam: "page", limitParam: "limit" }
const sorting = { sortParam: "_sort", orderParam: "_order" }

describe("listSignature", () => {
  it("query와 pagination이 모두 있으면 둘을 순서대로 나열한다", () => {
    const sig = listSignature({ ...base, sort: sorting, pagination: paging }, "ts")

    expect(sig.params).toBe("query: UsersListQuery = {}, page = 1, limit = 10")
    expect(sig.callArgs).toBe("query, page, limit")
    expect(sig.hasQuery).toBe(true)
    expect(sig.hasPaging).toBe(true)
  })

  it("query만 있으면 query만 나열한다", () => {
    const sig = listSignature({ ...base, search: { searchParam: "q" } }, "ts")

    expect(sig.params).toBe("query: UsersListQuery = {}")
    expect(sig.callArgs).toBe("query")
  })

  it("pagination만 있으면 page/limit만 나열한다", () => {
    const sig = listSignature({ ...base, pagination: paging }, "ts")

    expect(sig.params).toBe("page = 1, limit = 10")
    expect(sig.callArgs).toBe("page, limit")
  })

  it("둘 다 없으면 빈 문자열이다", () => {
    const sig = listSignature(base, "ts")

    expect(sig.params).toBe("")
    expect(sig.callArgs).toBe("")
    expect(sig.hasQuery).toBe(false)
    expect(sig.hasPaging).toBe(false)
  })

  it("js에서는 query에 타입 주석을 붙이지 않는다", () => {
    const sig = listSignature({ ...base, sort: sorting, pagination: paging }, "js")

    expect(sig.params).toBe("query = {}, page = 1, limit = 10")
    // callArgs는 언어와 무관하다
    expect(sig.callArgs).toBe("query, page, limit")
  })

  it("sort만 켜도, search만 켜도 query 인자가 생긴다", () => {
    expect(listSignature({ ...base, sort: sorting }, "ts").hasQuery).toBe(true)
    expect(
      listSignature({ ...base, search: { searchParam: "q" } }, "ts").hasQuery,
    ).toBe(true)
  })
})
