import { handleResetMockState } from "../tools/reset-mock-state"
import type { FileBrowserItemRes } from "../api-client"

const item: FileBrowserItemRes = {
  id: "u1",
  name: "users",
  itemType: "File",
  parentId: "f1",
  options: null,
  json: null,
  fields: null,
  path: "/shop/users",
  depth: 1,
  workspace: "ws1",
}

function makeClient(items: FileBrowserItemRes[] = [item]) {
  const resetIds: string[] = []
  const client = {
    getItems: async () => items,
    resetMockState: async (itemId: string) => {
      resetIds.push(itemId)
      return { success: true as const }
    },
  } as never
  return { client, resetIds }
}

const textOf = (result: { content: { text: string }[] }) =>
  result.content[0]?.text ?? ""

describe("handleResetMockState", () => {
  it("경로를 id로 해석해 resetMockState를 호출한다", async () => {
    const { client, resetIds } = makeClient()

    const result = await handleResetMockState(client, { path: "/shop/users" })

    expect(resetIds).toEqual(["u1"])
    expect(result.isError).toBeUndefined()
    expect(textOf(result)).toContain("/shop/users")
  })

  // 초기화 범위를 오해하면 사용자가 "데이터가 다 바뀐 줄" 알고 다시 갱신을 요청한다
  it("저장된 데이터는 바뀌지 않는다는 사실을 결과에 밝힌다", async () => {
    const { client } = makeClient()

    const text = textOf(
      await handleResetMockState(client, { path: "/shop/users" })
    )

    expect(text).toContain("저장된 데이터")
    expect(text).toContain("update_mock_api")
  })

  it("경로를 못 찾으면 tool error를 반환한다", async () => {
    const { client, resetIds } = makeClient()

    const result = await handleResetMockState(client, { path: "/nope" })

    expect(result.isError).toBe(true)
    expect(resetIds).toHaveLength(0)
  })

  it("폴더 경로면 tool error를 반환한다", async () => {
    const { client, resetIds } = makeClient([
      { ...item, itemType: "Folder", path: "/shop" },
    ])

    const result = await handleResetMockState(client, { path: "/shop" })

    expect(result.isError).toBe(true)
    expect(resetIds).toHaveLength(0)
  })
})
