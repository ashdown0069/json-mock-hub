import { handleUpdateMockApi } from "../tools/update-mock-api"
import type { FileBrowserItemRes } from "../api-client"
import type { McpConfig } from "../config"

jest.mock("@workspace/mockgen/generateData", () => ({
  generateDummyData: () => [{ title: "t1" }, { title: "t2" }],
}))

const config = {
  API_BASE_URL: "http://localhost:3000", MOCK_DOMAIN: "localhost:3000",
  MOCK_HUB_API_KEY: "k", MOCK_HUB_WORKSPACE_ID: "ws1",
} as McpConfig

const item: FileBrowserItemRes = {
  id: "u1", name: "users", itemType: "File", parentId: "f1", options: null,
  json: null, schema: { name: "string" }, fieldDefs: null,
  path: "/shop/users", depth: 1, workspace: "ws1",
}

const baseArgs = { path: "/shop/users", schema: { name: "string", age: "number" } as any, count: 3, locale: "ko" as const }

function makeClient(over: any = {}) {
  return {
    getItems: async () => [item],
    updateItem: over.updateItem ?? (async () => ({ isSuccess: true })),
  } as any
}

describe("handleUpdateMockApi", () => {
  it("기존 항목의 id·name·parentId를 유지하고 새 schema로 updateItem을 호출한다", async () => {
    let received: any
    const client = makeClient({ updateItem: async (p: any) => { received = p; return { isSuccess: true } } })
    const res = await handleUpdateMockApi(client, config, baseArgs)
    expect(received.itemId).toBe("u1")
    expect(received.name).toBe("users")
    expect(received.parentId).toBe("f1")
    expect(received.schema).toEqual({ name: "string", age: "number" })
    const text = (res.content[0] as any).text
    expect(text).toContain("/shop/users")
    expect(text).not.toContain("u1") // 내부 id 미노출
  })

  it("경로를 못 찾으면 tool error", async () => {
    const client = makeClient()
    const res = await handleUpdateMockApi(client, config, { ...baseArgs, path: "/nope" })
    expect(res.isError).toBe(true)
  })

  it("폴더 경로면 tool error", async () => {
    const client = { getItems: async () => [{ ...item, itemType: "Folder" }], updateItem: async () => ({ isSuccess: true }) } as any
    const res = await handleUpdateMockApi(client, config, baseArgs)
    expect(res.isError).toBe(true)
    expect((res.content[0] as any).text).toContain("폴더")
  })
})
