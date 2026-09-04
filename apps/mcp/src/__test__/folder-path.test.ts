import { ensureFolderPath } from "../folder-path"
import type { FileBrowserItemRes } from "../api-client"

function makeItem(
  id: string,
  name: string,
  path: string,
  itemType: "File" | "Folder" = "Folder",
  parentId: string | null = null
): FileBrowserItemRes {
  return {
    id,
    name,
    itemType,
    parentId,
    options: null,
    json: null,
    schema: null,
    fieldDefs: null,
    path,
    depth: 0,
    workspace: "ws1",
  }
}

/** createItem 호출을 기록하면서 매번 새 id를 돌려주는 가짜 클라이언트 */
function makeClient() {
  const calls: { name: string; itemType: string; parentId: string | null }[] = []
  let seq = 0
  const client = {
    createItem: async (payload: {
      name: string
      itemType: "File" | "Folder"
      parentId: string | null
    }) => {
      calls.push({
        name: payload.name,
        itemType: payload.itemType,
        parentId: payload.parentId,
      })
      seq += 1
      return { id: `new${seq}`, path: `/${payload.name}` }
    },
  } as never
  return { client, calls }
}

describe("ensureFolderPath", () => {
  it("루트('/')는 API를 호출하지 않고 parentId=null을 반환한다", async () => {
    const { client, calls } = makeClient()

    const result = await ensureFolderPath(client, [], "/")

    expect(result).toEqual({ ok: true, parentId: null, created: [] })
    expect(calls).toHaveLength(0)
  })

  it("이미 있는 폴더는 다시 만들지 않고 그 id를 반환한다", async () => {
    const { client, calls } = makeClient()
    const items = [makeItem("f1", "shop", "/shop")]

    const result = await ensureFolderPath(client, items, "/shop")

    expect(result).toEqual({ ok: true, parentId: "f1", created: [] })
    expect(calls).toHaveLength(0)
  })

  it("없는 중첩 폴더를 위에서부터 만들고 직전 응답의 _id를 다음 부모로 넘긴다", async () => {
    const { client, calls } = makeClient()

    const result = await ensureFolderPath(client, [], "/shop/v1")

    expect(calls).toEqual([
      { name: "shop", itemType: "Folder", parentId: null },
      { name: "v1", itemType: "Folder", parentId: "new1" },
    ])
    expect(result).toEqual({
      ok: true,
      parentId: "new2",
      created: ["/shop", "/shop/v1"],
    })
  })

  it("있는 폴더 아래에 없는 폴더만 이어 만든다", async () => {
    const { client, calls } = makeClient()
    const items = [makeItem("f1", "shop", "/shop")]

    const result = await ensureFolderPath(client, items, "/shop/v1")

    expect(calls).toEqual([{ name: "v1", itemType: "Folder", parentId: "f1" }])
    expect(result).toMatchObject({ ok: true, created: ["/shop/v1"] })
  })

  it("경로 중간이 mock API(File)면 아무것도 만들지 않고 ok:false를 반환한다", async () => {
    const { client, calls } = makeClient()
    const items = [makeItem("u1", "users", "/users", "File")]

    const result = await ensureFolderPath(client, items, "/users/v1")

    expect(result.ok).toBe(false)
    expect(calls).toHaveLength(0)
    if (!result.ok) expect(result.error).toContain("/users")
  })

  // 반쪽 생성 방지: 뒷 세그먼트가 잘못됐는데 앞 세그먼트를 먼저 만들면
  // 사용자 워크스페이스에 정리해야 할 빈 폴더가 남는다.
  it("이름 규칙을 어긴 세그먼트가 있으면 앞 세그먼트도 만들지 않는다", async () => {
    const { client, calls } = makeClient()

    const result = await ensureFolderPath(client, [], "/shop/bad name!")

    expect(result.ok).toBe(false)
    expect(calls).toHaveLength(0)
  })
})
