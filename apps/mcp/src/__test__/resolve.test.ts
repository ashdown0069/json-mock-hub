import { normalizePath, findItemByPath } from "../resolve"
import type { FileBrowserItemRes } from "../api-client"

const item = (over: Partial<FileBrowserItemRes>): FileBrowserItemRes => ({
  id: "id", name: "n", itemType: "File", parentId: null, options: null,
  json: null, schema: null, fieldDefs: null, path: "/n", depth: 0, workspace: "w",
  ...over,
})

describe("normalizePath", () => {
  it("빈 문자열과 '/'는 루트('/')로 통일한다", () => {
    expect(normalizePath("")).toBe("/")
    expect(normalizePath("/")).toBe("/")
  })
  it("앞 슬래시를 보정하고 뒤 슬래시·공백을 제거한다", () => {
    expect(normalizePath("shop/users/")).toBe("/shop/users")
    expect(normalizePath("  /shop  ")).toBe("/shop")
  })
  it("연속된 슬래시를 하나로 합친다", () => {
    expect(normalizePath("//shop//users/")).toBe("/shop/users")
    expect(normalizePath("///")).toBe("/")
  })
})

describe("findItemByPath", () => {
  const items = [
    item({ id: "1", path: "/shop", itemType: "Folder" }),
    item({ id: "2", path: "/shop/users" }),
  ]
  it("정규화 후 경로가 일치하는 항목을 찾는다", () => {
    expect(findItemByPath(items, "shop/users/")?.id).toBe("2")
  })
  it("일치하는 항목이 없으면 null을 반환한다", () => {
    expect(findItemByPath(items, "/nope")).toBeNull()
  })
})
