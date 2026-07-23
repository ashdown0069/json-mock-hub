import { buildQuerySnippet } from "../querySnippets"
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
  pagination: { pageParam: "page", limitParam: "limit" },
}

describe("buildQuerySnippet 생성", () => {
  it("쿼리 키와 5종 훅을 생성한다", () => {
    const code = buildQuerySnippet(ctx, "ts")
    expect(code).toContain("export const usersKeys = {")
    expect(code).toContain('all: ["users"] as const,')
    expect(code).toContain("export function useUsersListQuery() {")
    expect(code).toContain("export function useUsersQuery(id: string) {")
    expect(code).toContain("export function useCreateUsersMutation() {")
    expect(code).toContain("export function useUpdateUsersMutation() {")
    expect(code).toContain("export function useDeleteUsersMutation() {")
    expect(code).toContain(
      "queryClient.invalidateQueries({ queryKey: usersKeys.all });"
    )
    expect(code).toContain('} from "./usersApi";')
    expect(code).toContain('import type { Users } from "./usersSchema";')
  })

  it("JS에서는 as const와 타입 표기를 사용하지 않는다", () => {
    const code = buildQuerySnippet(ctx, "js")
    expect(code).not.toContain("as const")
    expect(code).toContain("export function useUsersQuery(id) {")
    expect(code).not.toContain("import type")
  })

  it("페이지네이션 활성화 시 page/limit 파라미터를 받는 목록 쿼리를 생성한다", () => {
    const code = buildQuerySnippet(paginatedCtx, "ts")
    expect(code).toContain(
      "export function useUsersListQuery(page = 1, limit = 10) {"
    )
    expect(code).toContain(
      "queryKey: [...usersKeys.all, { page, limit }] as const,"
    )
    expect(code).toContain("queryFn: () => getUsersList(page, limit),")
  })
})
