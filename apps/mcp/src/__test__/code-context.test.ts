import { buildCodeContext } from "../code-context"
import type { FileBrowserItemRes } from "../api-client"
import type { McpConfig } from "../config"

const config = {
  API_BASE_URL: "http://localhost:3000",
  MOCK_DOMAIN: "localhost:3000",
  MOCK_HUB_API_KEY: "k",
  MOCK_HUB_WORKSPACE_ID: "ws1",
} as McpConfig

const baseItem: FileBrowserItemRes = {
  id: "1", name: "user-list", itemType: "File", parentId: null, options: null,
  json: null, schema: { name: "string" }, fieldDefs: null,
  path: "/shop/user-list", depth: 1, workspace: "ws1",
}

describe("buildCodeContext", () => {
  it("item과 config로 CodeGenContext를 조립한다", () => {
    const ctx = buildCodeContext(baseItem, config)
    expect(ctx.resourceName).toBe("user_list") // 하이픈→언더바
    expect(ctx.typeName).toBe("UserList") // PascalCase
    expect(ctx.baseUrl).toBe("http://ws1.localhost:3000/api")
    expect(ctx.resourcePath).toBe("/shop/user-list")
    expect(ctx.schema).toEqual({ name: "string" })
    expect(ctx.pagination).toBeNull()
  })

  it("pagination 옵션을 반영한다", () => {
    const ctx = buildCodeContext(
      {
        ...baseItem,
        options: { pagination: true, paginationParams: { pageParam: "p", limitParam: "l" } },
      },
      config
    )
    expect(ctx.pagination).toEqual({ pageParam: "p", limitParam: "l" })
  })

  it("schema가 null이면 빈 객체로 대체한다", () => {
    const ctx = buildCodeContext({ ...baseItem, schema: null }, config)
    expect(ctx.schema).toEqual({})
  })
})
