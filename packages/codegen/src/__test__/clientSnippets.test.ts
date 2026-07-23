import { buildClientSnippet } from "../clientSnippets"
import { CodeGenContext } from "../types"

const ctx: CodeGenContext = {
  resourceName: "users",
  typeName: "Users",
  baseUrl: "http://ws1.localhost:3000/api",
  resourcePath: "/users",
  schema: { name: "string" },
  pagination: null,
}

const paginatedCtx: CodeGenContext = {
  ...ctx,
  pagination: { pageParam: "p", limitParam: "size" },
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
