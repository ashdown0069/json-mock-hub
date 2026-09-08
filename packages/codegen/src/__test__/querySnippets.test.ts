import { buildQuerySnippet } from "../querySnippets"
import { CodeGenContext } from "../types"

const ctx: CodeGenContext = {
  resourceName: "users",
  typeName: "Users",
  baseUrl: "http://ws1.localhost:3000/api",
  resourcePath: "/users",
  schema: { name: "string" },
  resourceType: "collection",
  pagination: null,
  sort: null,
  search: null,
}

const paginatedCtx: CodeGenContext = {
  ...ctx,
  pagination: { pageParam: "page", limitParam: "limit" },
}

const baseCtx = ctx

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

describe("buildQuerySnippet - listQuery(필터/정렬/검색)", () => {
  const listQueryCtx: CodeGenContext = {
    ...ctx,
    sort: { sortParam: "_sort", orderParam: "_order" },
    search: { searchParam: "q" },
  }
  const fullCtx: CodeGenContext = {
    ...ctx,
    pagination: { pageParam: "p", limitParam: "size" },
    sort: { sortParam: "_sort", orderParam: "_order" },
    search: { searchParam: "q" },
  }

  it("TS 목록 훅이 query 인자를 받고 queryKey에 포함한다", () => {
    const code = buildQuerySnippet(listQueryCtx, "ts")
    expect(code).toContain(
      "export function useUsersListQuery(query: UsersListQuery = {}) {"
    )
    expect(code).toContain("queryKey: [...usersKeys.all, query] as const,")
    expect(code).toContain("queryFn: () => getUsersList(query),")
    expect(code).toContain('import type { UsersListQuery } from "./usersApi";')
  })

  it("pagination+listQuery 조합에서 query·page·limit을 모두 전달한다", () => {
    const code = buildQuerySnippet(fullCtx, "ts")
    expect(code).toContain(
      "export function useUsersListQuery(query: UsersListQuery = {}, page = 1, limit = 10) {"
    )
    expect(code).toContain(
      "queryKey: [...usersKeys.all, query, { page, limit }] as const,"
    )
    expect(code).toContain("queryFn: () => getUsersList(query, page, limit),")
  })

  it("JS에서는 타입 import 없이 query 기본값 인자만 추가한다", () => {
    const code = buildQuerySnippet(listQueryCtx, "js")
    expect(code).toContain("export function useUsersListQuery(query = {}) {")
    expect(code).not.toContain("import type")
  })

  it("listQuery 미설정 시 기존 출력이 유지된다(회귀)", () => {
    const code = buildQuerySnippet(ctx, "ts")
    expect(code).toContain("export function useUsersListQuery() {")
    expect(code).not.toContain("UsersListQuery =")
    expect(code).not.toContain("import type { UsersListQuery }")
  })
})

describe("정렬·검색 설정 기반 훅 생성", () => {
  it("sort 또는 search가 활성화되면 query 인자를 받는 목록 훅을 생성한다", () => {
    const code = buildQuerySnippet(
      { ...baseCtx, sort: { sortParam: "_sort", orderParam: "_order" } },
      "ts"
    )
    expect(code).toContain("useUsersListQuery(query: UsersListQuery = {})")
  })

  it("모두 비활성화면 인자 없는 목록 훅을 생성한다", () => {
    const code = buildQuerySnippet(baseCtx, "ts")
    expect(code).toContain("useUsersListQuery()")
  })
})

describe("buildQuerySnippet - 단일 객체(resourceType: 'object')", () => {
  const objectCtx: CodeGenContext = {
    resourceName: "settings",
    typeName: "Settings",
    baseUrl: "http://ws1.localhost:3000/api",
    resourcePath: "/settings",
    schema: { theme: "string" },
    resourceType: "object",
    pagination: null,
    sort: null,
    search: null,
  }

  it("TS: 단일 객체용 쿼리 키 및 useSettingsQuery와 4종 mutation 훅을 생성하고 ById는 제외한다", () => {
    const code = buildQuerySnippet(objectCtx, "ts")
    expect(code).toContain("export const settingsKeys = {")
    expect(code).toContain('all: ["settings"] as const,')
    expect(code).not.toContain("detail:")

    expect(code).toContain("patchSettings,")
    expect(code).toContain("export function useSettingsQuery() {")
    expect(code).toContain("queryKey: settingsKeys.all,")
    expect(code).toContain("queryFn: () => getSettings(),")

    expect(code).toContain("export function useCreateSettingsMutation() {")
    expect(code).toContain("mutationFn: createSettings,")

    // PUT 계약: 전체 payload: Settings
    expect(code).toContain("export function useUpdateSettingsMutation() {")
    expect(code).toContain("mutationFn: (payload: Settings) => updateSettings(payload),")

    // PATCH 계약: 부분 payload: Partial<Settings>
    expect(code).toContain("export function usePatchSettingsMutation() {")
    expect(code).toContain("mutationFn: (payload: Partial<Settings>) => patchSettings(payload),")

    expect(code).toContain("export function useDeleteSettingsMutation() {")
    expect(code).toContain("mutationFn: () => deleteSettings(),")

    expect(code).not.toContain("useSettingsListQuery")
    expect(code).not.toContain("useSettingsById")
  })

  it("JS: 타입 표기 없이 단일 객체 훅을 생성한다", () => {
    const code = buildQuerySnippet(objectCtx, "js")
    expect(code).toContain("export function useSettingsQuery() {")
    expect(code).toContain("mutationFn: (payload) => updateSettings(payload),")
    expect(code).toContain("mutationFn: (payload) => patchSettings(payload),")
    expect(code).not.toContain("as const")
    expect(code).not.toContain("import type")
  })
})



