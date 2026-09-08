import { handleDeleteMockApi } from "../tools/delete-mock-api"
import { handleRenameMockApi } from "../tools/rename-mock-api"
import type { FileBrowserItemRes } from "../api-client"

jest.mock("@workspace/mockgen/generateData", () => ({
  generateDummyData: () => [{ title: "test" }],
}))

const items: FileBrowserItemRes[] = [
  { id: "f1", name: "shop", itemType: "Folder", parentId: null, options: null,
    json: null, fields: null, path: "/shop", depth: 0, workspace: "w" },
  { id: "u1", name: "users", itemType: "File", parentId: "f1", options: null,
    json: null, fields: null, path: "/shop/users", depth: 1, workspace: "w" },
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

describe("handleDeleteMockApi — 재귀 삭제 고지", () => {
  const items = [
    { id: "1", name: "shop", itemType: "Folder", parentId: null, path: "/shop" },
    { id: "2", name: "users", itemType: "File", parentId: "1", path: "/shop/users" },
    { id: "3", name: "orders", itemType: "File", parentId: "1", path: "/shop/orders" },
    { id: "4", name: "etc", itemType: "File", parentId: null, path: "/etc" },
  ]

  const createClient = () => ({
    getItems: jest.fn().mockResolvedValue(items),
    deleteItems: jest.fn().mockResolvedValue({ isSuccess: true }),
  })

  const textOf = (result: { content: { text: string }[] }) =>
    result.content[0]?.text ?? ""

  it("폴더 삭제 결과에 함께 지워진 하위 항목 수를 밝힌다", async () => {
    const client = createClient()

    const result = await handleDeleteMockApi(client as never, { path: "/shop" })

    expect(textOf(result)).toContain("2")
    expect(textOf(result)).toContain("/shop/users")
  })

  it("파일 삭제는 하위 항목 안내를 붙이지 않는다", async () => {
    const client = createClient()

    const result = await handleDeleteMockApi(client as never, {
      path: "/shop/users",
    })

    expect(textOf(result)).not.toContain("하위")
  })

  it("다른 폴더의 항목은 하위 계산에 포함하지 않는다", async () => {
    const client = createClient()

    const result = await handleDeleteMockApi(client as never, { path: "/shop" })

    expect(textOf(result)).not.toContain("/etc")
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
  it("트리 형태로 렌더링하고 내부 id는 노출하지 않는다", async () => {
    const client = { getItems: async () => items } as any
    const res = await handleListMockApis(client)
    const text = (res.content[0] as any).text
    expect(text).toContain("📁 shop")
    expect(text).toContain("📄 users")
    expect(text).not.toContain("u1")
    expect(text).not.toContain("f1")
  })

  it("항목이 없으면 안내 메시지를 반환한다", async () => {
    const client = { getItems: async () => [] } as any
    const res = await handleListMockApis(client)
    expect((res.content[0] as any).text).toContain("아직")
  })
})

import { handleMoveMockApi } from "../tools/move-mock-api"

describe("handleMoveMockApi", () => {
  it("경로를 id로 해석해 moveItem을 호출하고 새 경로를 안내한다", async () => {
    let call: { itemId: string; parentId: string | null } | undefined
    const client = {
      getItems: async () => items,
      moveItem: async (itemId: string, parentId: string | null) => {
        call = { itemId, parentId }
        return { isSuccess: true }
      },
    } as any

    const res = await handleMoveMockApi(client, {
      path: "/shop/users",
      destinationPath: "/",
    })

    expect(call).toEqual({ itemId: "u1", parentId: null })
    expect((res.content[0] as any).text).toContain("/shop/users")
    expect((res.content[0] as any).text).toContain("/users")
  })

  it("destinationPath가 폴더 경로면 그 폴더의 id를 parentId로 전달한다", async () => {
    const moveCalls: { itemId: string; parentId: string | null }[] = []
    const extended = [
      ...items,
      {
        id: "f2", name: "archive", itemType: "Folder" as const, parentId: null,
        options: null, json: null, fields: null,
        path: "/archive", depth: 0, workspace: "w",
      },
    ]
    const client = {
      getItems: async () => extended,
      moveItem: async (itemId: string, parentId: string | null) => {
        moveCalls.push({ itemId, parentId })
        return { isSuccess: true }
      },
    } as any

    const res = await handleMoveMockApi(client, {
      path: "/shop/users",
      destinationPath: "/archive",
    })

    expect(moveCalls).toEqual([{ itemId: "u1", parentId: "f2" }])
    expect((res.content[0] as any).text).toContain("/archive/users")
  })

  it("존재하지 않는 소스 경로는 toolError를 반환한다", async () => {
    const client = {
      getItems: async () => items,
      moveItem: async () => ({ isSuccess: true }),
    } as any
    const res = await handleMoveMockApi(client, { path: "/nope", destinationPath: "/" })
    expect(res.isError).toBe(true)
  })

  it("존재하지 않는 대상 경로는 toolError를 반환한다", async () => {
    const client = {
      getItems: async () => items,
      moveItem: async () => ({ isSuccess: true }),
    } as any
    const res = await handleMoveMockApi(client, {
      path: "/shop/users",
      destinationPath: "/nope",
    })
    expect(res.isError).toBe(true)
  })

  it("대상 경로가 폴더가 아니면 toolError를 반환한다", async () => {
    const client = {
      getItems: async () => items,
      moveItem: async () => ({ isSuccess: true }),
    } as any
    const res = await handleMoveMockApi(client, {
      path: "/shop/users",
      destinationPath: "/shop/users",
    })
    expect(res.isError).toBe(true)
  })

  describe("동명 폴더 병합", () => {
    const mergeItems = [
      {
        id: "src", name: "shop", itemType: "Folder" as const, parentId: null,
        options: null, json: null, fields: null,
        path: "/shop", depth: 0, workspace: "w",
      },
      {
        id: "archive", name: "archive", itemType: "Folder" as const, parentId: null,
        options: null, json: null, fields: null,
        path: "/archive", depth: 0, workspace: "w",
      },
      {
        id: "dst", name: "shop", itemType: "Folder" as const, parentId: "archive",
        options: null, json: null, fields: null,
        path: "/archive/shop", depth: 1, workspace: "w",
      },
    ]

    /** moveItem이 실제로 호출됐는지 추적하는 가짜 클라이언트 */
    function mergeClient() {
      let moved = false
      const client = {
        getItems: async () => mergeItems,
        moveItem: async () => {
          moved = true
          return { isSuccess: true }
        },
      } as any
      return { client, wasMoved: () => moved }
    }

    // 병합은 원본 폴더 문서를 삭제한다 — 사후 안내로는 되돌릴 수 없다
    it("확인 없이는 이동하지 않고 confirmMerge를 요구한다", async () => {
      const { client, wasMoved } = mergeClient()

      const res = await handleMoveMockApi(client, {
        path: "/shop",
        destinationPath: "/archive",
      })

      expect(res.isError).toBe(true)
      expect(wasMoved()).toBe(false)
      expect((res.content[0] as any).text).toContain("confirmMerge")
    })

    it("confirmMerge: true면 이동하고 병합 사실을 결과에 남긴다", async () => {
      const { client, wasMoved } = mergeClient()

      const res = await handleMoveMockApi(client, {
        path: "/shop",
        destinationPath: "/archive",
        confirmMerge: true,
      })

      expect(wasMoved()).toBe(true)
      expect(res.isError).toBeUndefined()
      expect((res.content[0] as any).text).toContain("병합")
    })
  })
})

