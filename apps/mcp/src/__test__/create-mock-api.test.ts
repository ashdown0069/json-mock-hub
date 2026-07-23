import { handleCreateMockApi } from "../tools/create-mock-api"
import type { FileBrowserItemRes } from "../api-client"
import type { McpConfig } from "../config"

jest.mock("@workspace/mockgen/generateData", () => ({
  generateDummyData: () => [{ title: "test" }, { title: "test2" }],
}))

const config = {
  API_BASE_URL: "http://localhost:3000",
  MOCK_DOMAIN: "localhost:3000",
  MOCK_HUB_API_KEY: "k",
  MOCK_HUB_WORKSPACE_ID: "ws1",
} as McpConfig

const baseArgs = {
  name: "users",
  schema: { title: "string" } as any,
  parentPath: "/",
  count: 3,
  locale: "ko" as const,
}

function makeClient(over: Partial<{
  getItems: () => Promise<FileBrowserItemRes[]>
  createItem: (p: any) => Promise<{ _id: string; path: string }>
}> = {}) {
  return {
    getItems: over.getItems ?? (async () => []),
    createItem: over.createItem ?? (async () => ({ _id: "x", path: "/users" })),
  } as any
}

describe("handleCreateMockApi", () => {
  it("루트 생성 시 parentId=null로 createItem을 호출하고 출력에 id를 노출하지 않는다", async () => {
    let received: any
    const client = makeClient({
      createItem: async (p) => {
        received = p
        return { _id: "secret-id", path: "/users" }
      },
    })
    const res = await handleCreateMockApi(client, config, baseArgs)
    expect(received.parentId).toBeNull()
    const text = (res.content[0] as any).text
    expect(text).toContain("/users")
    expect(text).not.toContain("secret-id")
    expect(text).not.toContain("itemId")
  })

  it("parentPath를 실제 폴더 id로 해석해 createItem에 전달한다", async () => {
    let received: any
    const client = makeClient({
      getItems: async () => [
        { id: "f1", name: "shop", itemType: "Folder", parentId: null, options: null,
          json: null, schema: null, fieldDefs: null, path: "/shop", depth: 0, workspace: "ws1" },
      ],
      createItem: async (p) => {
        received = p
        return { _id: "x", path: "/shop/users" }
      },
    })
    const res = await handleCreateMockApi(client, config, { ...baseArgs, parentPath: "/shop" })
    expect(received.parentId).toBe("f1")
    expect((res.content[0] as any).text).toContain("/shop/users")
  })

  it("부모 폴더 경로를 못 찾으면 tool error를 반환한다", async () => {
    const client = makeClient({ getItems: async () => [] })
    const res = await handleCreateMockApi(client, config, { ...baseArgs, parentPath: "/nope" })
    expect(res.isError).toBe(true)
    expect((res.content[0] as any).text).toContain("/nope")
  })
})
