import { buildHydrationState } from "../hydrateFromItem"
import { FileItem } from "@/features/file-browser/types"
import { FieldType } from "@/types/schema"

describe("buildHydrationState — 수정 다이얼로그 폼 복원 규칙", () => {
  const base: FileItem = { id: "1", name: "/users", itemType: "File" }

  it("fieldDefs가 있으면 그대로 fields로 사용한다", () => {
    const fieldDefs = [{ id: "f1", name: "email", type: "string" as FieldType }]
    const state = buildHydrationState({ ...base, fieldDefs })
    expect(state.fields).toBe(fieldDefs)
    expect(state.apiPath).toBe("/users")
  })

  it("fieldDefs가 없으면 schema를 역변환해 fields를 만든다", () => {
    const state = buildHydrationState({
      ...base,
      fieldDefs: null,
      schema: { email: "string" },
    })
    expect(state.fields.length).toBeGreaterThan(0)
    expect(state.fields[0]).toMatchObject({ name: "email", type: "string" })
  })

  it("json 배열 길이를 1~50 범위로 clamp해 itemCount로 쓴다", () => {
    expect(
      buildHydrationState({ ...base, json: new Array(200).fill({}) }).itemCount
    ).toEqual([50])
    expect(buildHydrationState({ ...base, json: [] }).itemCount).toEqual([1])
    expect(buildHydrationState({ ...base, json: "not-array" }).itemCount).toEqual([10])
  })

  it("pagination 옵션이 없으면 기본값(false, page/limit)을 채운다", () => {
    const state = buildHydrationState(base)
    expect(state.enablePagination).toBe(false)
    expect(state.pageParam).toBe("page")
    expect(state.limitParam).toBe("limit")
  })
})
