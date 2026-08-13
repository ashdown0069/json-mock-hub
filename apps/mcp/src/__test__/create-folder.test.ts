import { handleCreateFolder } from "../tools/create-folder"
import type { FileBrowserItemRes } from "../api-client"

function makeItem(
  id: string,
  name: string,
  path: string,
  itemType: "File" | "Folder" = "Folder"
): FileBrowserItemRes {
  return {
    id,
    name,
    itemType,
    parentId: null,
    options: null,
    json: null,
    schema: null,
    fieldDefs: null,
    path,
    depth: 0,
    workspace: "ws1",
  }
}

function makeClient(items: FileBrowserItemRes[] = []) {
  const created: string[] = []
  let seq = 0
  const client = {
    getItems: async () => items,
    createItem: async (payload: { name: string }) => {
      created.push(payload.name)
      seq += 1
      return { _id: `new${seq}`, path: `/${payload.name}` }
    },
  } as never
  return { client, created }
}

const textOf = (result: { content: { text: string }[] }) =>
  result.content[0]?.text ?? ""

describe("handleCreateFolder", () => {
  it("없는 폴더를 만들고 생성한 경로를 안내한다", async () => {
    const { client, created } = makeClient()

    const result = await handleCreateFolder(client, { path: "/shop" })

    expect(created).toEqual(["shop"])
    expect(result.isError).toBeUndefined()
    expect(textOf(result)).toContain("/shop")
  })

  it("중첩 경로를 한 번의 호출로 위에서부터 만든다", async () => {
    const { client, created } = makeClient()

    const result = await handleCreateFolder(client, { path: "/shop/v1" })

    expect(created).toEqual(["shop", "v1"])
    expect(textOf(result)).toContain("/shop/v1")
  })

  it("이미 있는 폴더면 createItem을 호출하지 않고 그 사실을 알린다", async () => {
    const { client, created } = makeClient([makeItem("f1", "shop", "/shop")])

    const result = await handleCreateFolder(client, { path: "/shop" })

    expect(created).toHaveLength(0)
    expect(result.isError).toBeUndefined()
    expect(textOf(result)).toContain("이미 존재")
  })

  it("루트('/')는 tool error를 반환한다", async () => {
    const { client, created } = makeClient()

    const result = await handleCreateFolder(client, { path: "/" })

    expect(result.isError).toBe(true)
    expect(created).toHaveLength(0)
  })

  it("경로가 이미 mock API(File)면 tool error를 반환한다", async () => {
    const { client, created } = makeClient([
      makeItem("u1", "users", "/users", "File"),
    ])

    const result = await handleCreateFolder(client, { path: "/users" })

    expect(result.isError).toBe(true)
    expect(created).toHaveLength(0)
  })
})
