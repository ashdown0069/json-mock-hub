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

describe("예약 필드 id 주입", () => {
  it("createItem에 전달되는 schema 최상위에 id: number가 주입된다", async () => {
    const client = makeClient({
      createItem: jest.fn().mockResolvedValue({ _id: "x", path: "/products" }),
    })
    await handleCreateMockApi(client, config, {
      name: "products",
      schema: { title: "string" },
      parentPath: "/",
      count: 2,
      locale: "ko",
    })
    const sent = (client.createItem as jest.Mock).mock.calls[0][0]
    expect(sent.schema.id).toBe("number")
    expect(Object.keys(sent.schema)[0]).toBe("id")
  })

  it("사용자가 schema에 id를 정의해도 number로 덮어쓴다", async () => {
    const client = makeClient({
      createItem: jest.fn().mockResolvedValue({ _id: "x", path: "/products" }),
    })
    await handleCreateMockApi(client, config, {
      name: "products",
      schema: { id: "uuid", title: "string" },
      parentPath: "/",
      count: 2,
      locale: "ko",
    })
    const sent = (client.createItem as jest.Mock).mock.calls[0][0]
    expect(sent.schema.id).toBe("number")
  })
})

describe("handleCreateMockApi — 대소문자 충돌 선차단", () => {
  const existing = (
    name: string,
    path: string,
    parentId: string | null = null
  ): FileBrowserItemRes => ({
    id: `id-${name}`,
    name,
    itemType: "File",
    parentId,
    options: null,
    json: null,
    schema: null,
    fieldDefs: null,
    path,
    depth: 0,
    workspace: "ws1",
  })

  it("같은 부모에 대소문자만 다른 이름이 있으면 만들지 않는다", async () => {
    const createItem = jest.fn()
    const client = makeClient({
      getItems: async () => [existing("Products", "/Products")],
      createItem,
    })

    const res = await handleCreateMockApi(client, config, {
      ...baseArgs,
      name: "products",
    })

    expect(res.isError).toBe(true)
    expect(createItem).not.toHaveBeenCalled()
    // 어떤 이름과 부딪혔는지 알려줘야 LLM이 다른 이름을 고를 수 있다
    expect((res.content[0] as any).text).toContain("Products")
  })

  it("다른 부모 아래의 동명 항목은 충돌로 보지 않는다", async () => {
    const createItem = jest.fn().mockResolvedValue({ _id: "x", path: "/products" })
    const client = makeClient({
      getItems: async () => [existing("Products", "/shop/Products", "f1")],
      createItem,
    })

    const res = await handleCreateMockApi(client, config, {
      ...baseArgs,
      name: "products",
    })

    expect(res.isError).toBeUndefined()
    expect(createItem).toHaveBeenCalled()
  })

  it("충돌이 없으면 그대로 생성한다", async () => {
    const createItem = jest.fn().mockResolvedValue({ _id: "x", path: "/users" })
    const client = makeClient({
      getItems: async () => [existing("orders", "/orders")],
      createItem,
    })

    const res = await handleCreateMockApi(client, config, baseArgs)

    expect(res.isError).toBeUndefined()
    expect(createItem).toHaveBeenCalled()
  })
})

describe("handleCreateMockApi — createParents", () => {
  /** createItem 호출을 순서대로 기록하는 클라이언트 (폴더 생성 + 파일 생성이 섞인다) */
  function makeRecordingClient(items: FileBrowserItemRes[] = []) {
    const calls: { name: string; itemType: string; parentId: string | null }[] = []
    let seq = 0
    const client = {
      getItems: async () => items,
      createItem: async (payload: any) => {
        calls.push({
          name: payload.name,
          itemType: payload.itemType,
          parentId: payload.parentId,
        })
        seq += 1
        return { _id: `new${seq}`, path: `/${payload.name}` }
      },
    } as any
    return { client, calls }
  }

  it("createParents: true면 없는 부모 폴더를 만들고 그 id로 파일을 만든다", async () => {
    const { client, calls } = makeRecordingClient()

    const res = await handleCreateMockApi(client, config, {
      ...baseArgs,
      parentPath: "/shop",
      createParents: true,
    })

    expect(res.isError).toBeUndefined()
    expect(calls).toEqual([
      { name: "shop", itemType: "Folder", parentId: null },
      { name: "users", itemType: "File", parentId: "new1" },
    ])
  })

  it("createParents 없이 부모가 없으면 폴더를 만들지 않고 tool error를 낸다", async () => {
    const { client, calls } = makeRecordingClient()

    const res = await handleCreateMockApi(client, config, {
      ...baseArgs,
      parentPath: "/shop",
    })

    expect(res.isError).toBe(true)
    expect(calls).toHaveLength(0)
    // 실행 가능한 다음 행동을 알려줘야 LLM이 막다른 길에 빠지지 않는다
    expect((res.content[0] as any).text).toContain("createParents")
  })

  it("부모가 이미 있으면 createParents: true여도 폴더를 새로 만들지 않는다", async () => {
    const { client, calls } = makeRecordingClient([
      { id: "f1", name: "shop", itemType: "Folder", parentId: null, options: null,
        json: null, schema: null, fieldDefs: null, path: "/shop", depth: 0, workspace: "ws1" },
    ])

    await handleCreateMockApi(client, config, {
      ...baseArgs,
      parentPath: "/shop",
      createParents: true,
    })

    expect(calls).toEqual([
      { name: "users", itemType: "File", parentId: "f1" },
    ])
  })

  it("parentPath가 mock API(File)면 폴더로 쓸 수 없다고 알린다", async () => {
    const { client, calls } = makeRecordingClient([
      { id: "u1", name: "orders", itemType: "File", parentId: null, options: null,
        json: null, schema: null, fieldDefs: null, path: "/orders", depth: 0, workspace: "ws1" },
    ])

    const res = await handleCreateMockApi(client, config, {
      ...baseArgs,
      parentPath: "/orders",
      createParents: true,
    })

    expect(res.isError).toBe(true)
    expect(calls).toHaveLength(0)
  })
})

describe("handleCreateMockApi — sort·search 옵션", () => {
  it("sort를 지정하면 createItem 페이로드의 options.sort가 켜진다", async () => {
    const createItem = jest.fn().mockResolvedValue({ _id: "x", path: "/users" })
    const client = makeClient({ createItem })

    await handleCreateMockApi(client, config, {
      ...baseArgs,
      sort: { sortParam: "_sort", orderParam: "_order" },
    } as any)

    const sent = createItem.mock.calls[0][0]
    expect(sent.options.sort).toBe(true)
    expect(sent.options.sortParams).toEqual({
      sortParam: "_sort",
      orderParam: "_order",
    })
  })

  it("search를 지정하면 options.search가 켜지고 결과 안내에 쿼리 예시가 붙는다", async () => {
    const createItem = jest.fn().mockResolvedValue({ _id: "x", path: "/users" })
    const client = makeClient({ createItem })

    const res = await handleCreateMockApi(client, config, {
      ...baseArgs,
      search: { searchParam: "q" },
    } as any)

    expect(createItem.mock.calls[0][0].options.search).toBe(true)
    expect((res.content[0] as any).text).toContain("?q=검색어")
  })

  it("옵션을 하나도 지정하지 않으면 전부 꺼진 채로 생성된다", async () => {
    const createItem = jest.fn().mockResolvedValue({ _id: "x", path: "/users" })
    const client = makeClient({ createItem })

    await handleCreateMockApi(client, config, baseArgs)

    const sent = createItem.mock.calls[0][0]
    expect(sent.options.pagination).toBe(false)
    expect(sent.options.sort).toBeUndefined()
    expect(sent.options.search).toBeUndefined()
  })
})
