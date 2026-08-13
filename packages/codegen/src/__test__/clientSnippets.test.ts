import { buildClientSnippet } from "../clientSnippets"
import { CodeGenContext } from "../types"
import { SchemaObject } from "@workspace/types"

const ctx: CodeGenContext = {
  resourceName: "users",
  typeName: "Users",
  baseUrl: "http://ws1.localhost:3000/api",
  resourcePath: "/users",
  schema: { name: "string" },
  pagination: null,
  sort: null,
  search: null,
}

const paginatedCtx: CodeGenContext = {
  ...ctx,
  pagination: { pageParam: "p", limitParam: "size" },
}

const listQueryCtx: CodeGenContext = {
  ...ctx,
  sort: { sortParam: "_sort", orderParam: "_order" },
  search: { searchParam: "q" },
}

const fullCtx: CodeGenContext = {
  ...paginatedCtx,
  sort: { sortParam: "_sort", orderParam: "_order" },
  search: { searchParam: "q" },
}

describe("buildClientSnippet - axios", () => {
  it("TS에서 CRUD 5종 함수와 제네릭 타입을 생성한다", () => {
    const code = buildClientSnippet(ctx, "axios", "ts")
    expect(code).toContain(
      'const api = axios.create({ baseURL: "http://ws1.localhost:3000/api" });'
    )
    expect(code).toContain(
      "export async function getUsersList(): Promise<Users[]> {"
    )
    expect(code).toContain('api.get<Users[]>("/users")')
    expect(code).toContain(
      "export async function getUsersById(id: string): Promise<Users> {"
    )
    expect(code).toContain(
      "export async function createUsers(payload: Users): Promise<Users> {"
    )
    expect(code).toContain(
      "export async function updateUsers(id: string, payload: Partial<Users>): Promise<Users> {"
    )
    expect(code).toContain(
      "export async function deleteUsers(id: string): Promise<void> {"
    )
    expect(code).toContain('import type { Users } from "./usersSchema";')
  })

  it("JS에서는 타입 표기를 포함하지 않는다", () => {
    const code = buildClientSnippet(ctx, "axios", "js")
    expect(code).not.toContain(": Promise<")
    expect(code).toContain("export async function getUsersList() {")
    expect(code).not.toContain("import type")
  })

  it("페이지네이션 활성화 시 커스텀 파라미터명으로 쿼리를 구성한다", () => {
    const code = buildClientSnippet(paginatedCtx, "axios", "ts")
    expect(code).toContain('params: { "p": page, "size": limit }')
    expect(code).toContain("Promise<UsersListResponse>")
    expect(code).toContain("export interface UsersListResponse {")
    expect(code).toContain("totalItems: number;")
  })
})

describe("buildClientSnippet - fetch", () => {
  it("fetch 기반 CRUD 함수를 생성한다", () => {
    const code = buildClientSnippet(ctx, "fetch", "ts")
    expect(code).toContain(
      'const BASE_URL = "http://ws1.localhost:3000/api";'
    )
    expect(code).toContain("await fetch(`${BASE_URL}/users`)")
    expect(code).toContain('method: "POST"')
    expect(code).toContain('method: "DELETE"')
    expect(code).toContain("handleResponse<Users[]>(res)")
    expect(code).toContain('import type { Users } from "./usersSchema";')
  })

  it("페이지네이션 활성화 시 URLSearchParams로 쿼리를 구성한다", () => {
    const code = buildClientSnippet(paginatedCtx, "fetch", "js")
    expect(code).toContain("new URLSearchParams({")
    expect(code).toContain('"p": String(page),')
    expect(code).toContain('"size": String(limit),')
  })
})

describe("buildClientSnippet - listQuery(필터/정렬/검색)", () => {
  it("TS axios에서 ListQuery 인터페이스와 query 인자를 생성한다", () => {
    const code = buildClientSnippet(listQueryCtx, "axios", "ts")
    expect(code).toContain("export interface UsersListQuery {")
    expect(code).toContain('"_order"?: "asc" | "desc";')
    expect(code).toContain(
      "export async function getUsersList(query: UsersListQuery = {}): Promise<Users[]> {"
    )
    expect(code).toContain("params: query")
  })

  it("pagination과 listQuery 동시 활성화 시 query와 페이지 파라미터를 병합한다", () => {
    const code = buildClientSnippet(fullCtx, "axios", "ts")
    expect(code).toContain(
      "export async function getUsersList(query: UsersListQuery = {}, page = 1, limit = 10): Promise<UsersListResponse> {"
    )
    expect(code).toContain('params: { ...query, "p": page, "size": limit }')
  })

  it("fetch에서는 undefined를 제외한 URLSearchParams를 구성한다", () => {
    const code = buildClientSnippet(listQueryCtx, "fetch", "ts")
    expect(code).toContain("const params = new URLSearchParams();")
    expect(code).toContain("Object.entries(query).forEach(([key, value]) => {")
    expect(code).toContain("if (value !== undefined) params.set(key, String(value));")
  })

  it("JS에서는 타입 표기 없이 query 기본값 인자만 추가한다", () => {
    const code = buildClientSnippet(listQueryCtx, "axios", "js")
    expect(code).toContain("export async function getUsersList(query = {}) {")
    expect(code).not.toContain("UsersListQuery")
  })

  it("listQuery 미설정 시 기존 출력에 ListQuery가 포함되지 않는다(회귀)", () => {
    expect(buildClientSnippet(ctx, "axios", "ts")).not.toContain("UsersListQuery")
    expect(buildClientSnippet(paginatedCtx, "fetch", "ts")).not.toContain("UsersListQuery")
  })
})

describe("정렬·검색 설정 기반 ListQuery 타입", () => {
  const baseCtx = {
    resourceName: "users",
    typeName: "Users",
    baseUrl: "http://ws1.localhost:3000/api",
    resourcePath: "/users",
    schema: { id: "number", name: "string" } as SchemaObject,
    pagination: null,
    sort: null,
    search: null,
  }

  it("sort만 활성화하면 설정된 파라미터명 2개만 타입에 포함된다", () => {
    const code = buildClientSnippet(
      { ...baseCtx, sort: { sortParam: "orderBy", orderParam: "direction" } },
      "axios",
      "ts"
    )
    expect(code).toContain('"orderBy"?: string;')
    expect(code).toContain('"direction"?: "asc" | "desc";')
    expect(code).not.toContain("q?:")
    // 필터 제거: 인덱스 시그니처가 없어야 한다
    expect(code).not.toContain("[field: string]")
  })

  it("search만 활성화하면 검색 파라미터만 타입에 포함된다", () => {
    const code = buildClientSnippet(
      { ...baseCtx, search: { searchParam: "keyword" } },
      "axios",
      "ts"
    )
    expect(code).toContain('"keyword"?: string;')
    expect(code).not.toContain("orderBy")
  })

  it("sort/search 모두 비활성화면 ListQuery 타입과 query 인자가 없다", () => {
    const code = buildClientSnippet(baseCtx, "axios", "ts")
    expect(code).not.toContain("ListQuery")
    expect(code).toContain("export async function getUsersList(): Promise<Users[]>")
  })

  it("fetch 클라이언트도 동일한 규칙을 따른다", () => {
    const code = buildClientSnippet(
      { ...baseCtx, search: { searchParam: "q" } },
      "fetch",
      "ts"
    )
    expect(code).toContain('"q"?: string;')
  })
})

describe("buildClientSnippet — 생성 코드 이스케이프", () => {
  const ctxWith = (over: Record<string, unknown>) =>
    ({
      resourceName: "users",
      typeName: "Users",
      baseUrl: "http://localhost:4001/api",
      resourcePath: "/users",
      schema: { id: "number" },
      pagination: null,
      sort: null,
      search: null,
      ...over,
    }) as never

  it("axios: baseUrl의 따옴표가 리터럴을 탈출하지 못한다", () => {
    const code = buildClientSnippet(
      ctxWith({ baseUrl: 'http://a"; process.exit(1); //' }),
      "axios",
      "js"
    )
    expect(code).not.toContain('baseURL: "http://a"; process.exit(1); //"')
    expect(code).toContain('\\"')
  })

  it("fetch: baseUrl의 따옴표가 리터럴을 탈출하지 못한다", () => {
    const code = buildClientSnippet(
      ctxWith({ baseUrl: 'http://a"; process.exit(1); //' }),
      "fetch",
      "js"
    )
    expect(code).not.toContain('BASE_URL = "http://a"; process.exit(1); //"')
    expect(code).toContain('\\"')
  })

  it("axios: resourcePath의 ${...}가 템플릿에서 평가되지 않도록 이스케이프한다", () => {
    const code = buildClientSnippet(
      ctxWith({ resourcePath: "/u${process.env.SECRET}s" }),
      "axios",
      "js"
    )
    expect(code).toContain("\\${process.env.SECRET}")
  })

  it("fetch: resourcePath의 ${...}가 템플릿에서 평가되지 않도록 이스케이프한다", () => {
    const code = buildClientSnippet(
      ctxWith({ resourcePath: "/u${process.env.SECRET}s" }),
      "fetch",
      "js"
    )
    expect(code).toContain("\\${process.env.SECRET}")
  })

  it("정상 입력의 출력은 바뀌지 않는다", () => {
    const code = buildClientSnippet(ctxWith({}), "axios", "js")
    expect(code).toContain('baseURL: "http://localhost:4001/api"')
    expect(code).toContain('"/users"')
  })
})


