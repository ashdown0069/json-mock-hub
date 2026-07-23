import { handleDeleteMockApi } from "../tools/delete-mock-api"
import { handleRenameMockApi } from "../tools/rename-mock-api"
import type { FileBrowserItemRes } from "../api-client"

jest.mock("@workspace/mockgen/generateData", () => ({
  generateDummyData: () => [{ title: "test" }],
}))

const items: FileBrowserItemRes[] = [
  { id: "f1", name: "shop", itemType: "Folder", parentId: null, options: null,
    json: null, schema: null, fieldDefs: null, path: "/shop", depth: 0, workspace: "w" },
  { id: "u1", name: "users", itemType: "File", parentId: "f1", options: null,
    json: null, schema: null, fieldDefs: null, path: "/shop/users", depth: 1, workspace: "w" },
]

describe("handleDeleteMockApi", () => {
  it("경로를 id로 해석해 deleteItems를 호출한다", async () => {
    let deleted: string[] | undefined
    const client = {
      getItems: async () => items,
      deleteItems: async (ids: string[]) => { deleted = ids; return { isSuccess: true } },
    } as any
    const res = await handleDeleteMockApi(client, { path: "/shop/users" })
    expect(deleted).toEqual(["u1"])
    expect((res.content[0] as any).text).toContain("/shop/users")
  })

  it("경로를 못 찾으면 tool error", async () => {
    const client = { getItems: async () => items, deleteItems: async () => ({ isSuccess: true }) } as any
    const res = await handleDeleteMockApi(client, { path: "/nope" })
    expect(res.isError).toBe(true)
  })
})

describe("handleRenameMockApi", () => {
  it("경로를 id로 해석해 renameItem을 호출한다", async () => {
    let call: { id: string; name: string } | undefined
    const client = {
      getItems: async () => items,
      renameItem: async (id: string, name: string) => { call = { id, name }; return { isSuccess: true } },
    } as any
    const res = await handleRenameMockApi(client, { path: "/shop/users", newName: "members" })
    expect(call).toEqual({ id: "u1", name: "members" })
    expect((res.content[0] as any).text).toContain("members")
  })
})

import { handleListMockApis } from "../tools/list-mock-apis"

describe("handleListMockApis", () => {
  it("경로만 정렬해 나열하고 내부 id는 노출하지 않는다", async () => {
    const client = { getItems: async () => items } as any
    const res = await handleListMockApis(client)
    const text = (res.content[0] as any).text
    expect(text).toContain("/shop")
    expect(text).toContain("/shop/users")
    expect(text).not.toContain("u1")
    expect(text).not.toContain("f1")
  })

  it("항목이 없으면 안내 메시지를 반환한다", async () => {
    const client = { getItems: async () => [] } as any
    const res = await handleListMockApis(client)
    expect((res.content[0] as any).text).toContain("아직")
  })
})
