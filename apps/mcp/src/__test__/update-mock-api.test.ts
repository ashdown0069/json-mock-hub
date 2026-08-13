import { handleUpdateMockApi } from "../tools/update-mock-api"
import type { FileBrowserItemRes } from "../api-client"
import type { McpConfig } from "../config"

const generateCalls: unknown[][] = []
jest.mock("@workspace/mockgen/generateData", () => ({
  generateDummyData: (...args: unknown[]) => {
    generateCalls.push(args)
    return [{ title: "t1" }, { title: "t2" }]
  },
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
  const getItems = over.getItems ?? (async () => [item])
  const getItem = over.getItem ?? (async (id: string) => {
    const list = await getItems()
    return list.find((it: any) => it.id === id) ?? null
  })
  return {
    getItems,
    getItem,
    updateItem: over.updateItem ?? (async () => ({ isSuccess: true })),
    ...over,
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
    expect(received.schema).toEqual({ id: "number", name: "string", age: "number" })
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
    const client = makeClient({ getItems: async () => [{ ...item, itemType: "Folder" }] })
    const res = await handleUpdateMockApi(client, config, baseArgs)
    expect(res.isError).toBe(true)
    expect((res.content[0] as any).text).toContain("폴더")
  })
})

describe("예약 필드 id 주입", () => {
  it("updateItem에 전달되는 schema 최상위에 id: number가 주입된다", async () => {
    const client = makeClient({
      updateItem: jest.fn().mockResolvedValue({ isSuccess: true }),
    })
    await handleUpdateMockApi(client, config, {
      path: "/shop/users",
      schema: { title: "string" },
      count: 2,
      locale: "ko",
    })
    const sent = (client.updateItem as jest.Mock).mock.calls[0][0]
    expect(sent.schema.id).toBe("number")
    expect(Object.keys(sent.schema)[0]).toBe("id")
  })

  it("사용자가 schema에 id를 정의해도 number로 덮어쓴다", async () => {
    const client = makeClient({
      updateItem: jest.fn().mockResolvedValue({ isSuccess: true }),
    })
    await handleUpdateMockApi(client, config, {
      path: "/shop/users",
      schema: { id: "uuid", title: "string" },
      count: 2,
      locale: "ko",
    })
    const sent = (client.updateItem as jest.Mock).mock.calls[0][0]
    expect(sent.schema.id).toBe("number")
  })
})

describe("handleUpdateMockApi — 부분 갱신", () => {
  const storedItem = {
    id: "2",
    name: "users",
    itemType: "File" as const,
    parentId: "1",
    path: "/shop/users",
    schema: { id: "number", email: "string" },
    options: {
      pagination: true,
      paginationParams: { pageParam: "page", limitParam: "limit" },
      sort: true,
      sortParams: { sortParam: "_sort", orderParam: "_order" },
    },
  }

  const createClient = () => ({
    getItems: jest.fn().mockResolvedValue([storedItem]),
    getItem: jest.fn().mockResolvedValue(storedItem),
    updateItem: jest.fn().mockResolvedValue({ isSuccess: true }),
  })

  const testConfig = {
    MOCK_HUB_WORKSPACE_ID: "ws1",
    MOCK_DOMAIN: "localhost:4001",
  } as never

  it("pagination을 지정하지 않으면 기존 options를 그대로 보존한다", async () => {
    const client = createClient()

    await handleUpdateMockApi(client as never, testConfig, {
      path: "/shop/users",
      count: 20,
      locale: "ko",
    })

    expect(client.updateItem.mock.calls[0][0].options).toEqual(
      storedItem.options
    )
  })

  it("schema를 지정하지 않으면 저장된 스키마를 재사용한다", async () => {
    const client = createClient()

    await handleUpdateMockApi(client as never, testConfig, {
      path: "/shop/users",
      count: 5,
      locale: "ko",
    })

    expect(client.updateItem.mock.calls[0][0].schema).toMatchObject({
      email: "string",
    })
  })

  it("schema를 지정하면 기존 스키마를 완전히 대체한다", async () => {
    const client = createClient()

    await handleUpdateMockApi(client as never, testConfig, {
      path: "/shop/users",
      schema: { nickname: "string" },
      count: 5,
      locale: "ko",
    })

    const sent = client.updateItem.mock.calls[0][0].schema
    expect(sent).toMatchObject({ nickname: "string" })
    expect(sent).not.toHaveProperty("email")
  })

  it("pagination을 지정하면 켜고 나머지 옵션은 유지한다", async () => {
    const client = createClient()

    await handleUpdateMockApi(client as never, testConfig, {
      path: "/shop/users",
      count: 5,
      locale: "ko",
      pagination: { pageParam: "p", limitParam: "size" },
    })

    const options = client.updateItem.mock.calls[0][0].options
    expect(options.pagination).toBe(true)
    expect(options.paginationParams).toEqual({ pageParam: "p", limitParam: "size" })
    expect(options.sort).toBe(true)
  })

  it("disablePagination=true일 때만 페이지네이션을 끈다", async () => {
    const client = createClient()

    await handleUpdateMockApi(client as never, testConfig, {
      path: "/shop/users",
      count: 5,
      locale: "ko",
      disablePagination: true,
    })

    const options = client.updateItem.mock.calls[0][0].options
    expect(options.pagination).toBe(false)
    expect(options.sort).toBe(true)
  })

  it("저장된 스키마도 없고 인자도 없으면 안내 오류를 반환한다", async () => {
    const client = createClient()
    client.getItem.mockResolvedValue({ ...storedItem, schema: null })

    const result = await handleUpdateMockApi(client as never, testConfig, {
      path: "/shop/users",
      count: 5,
      locale: "ko",
    })

    expect(result.isError).toBe(true)
    expect(client.updateItem).not.toHaveBeenCalled()
  })

  // fakerMethod는 FAKER_BY_TYPE의 타입별 허용 목록에 있는 값이어야 한다.
  // number에 허용된 것은 location.latitude/longitude, number.int/float뿐이다
  // (commerce.price는 "745.69" 문자열을 반환하므로 string 그룹에 있다).
  const itemWithFakerDefs: FileBrowserItemRes = {
    ...item,
    schema: { name: "string", price: "number" },
    fieldDefs: [
      { id: "f1", name: "name", type: "string", fakerMethod: "person.fullName" },
      { id: "f2", name: "price", type: "number", fakerMethod: "number.float" },
    ],
  }

  beforeEach(() => {
    generateCalls.length = 0
  })

  it("schema 미지정이면 저장된 fieldDefs의 faker 설정을 유지한다", async () => {
    let received: any
    const client = makeClient({
      getItems: async () => [itemWithFakerDefs],
      updateItem: async (p: any) => { received = p; return { isSuccess: true } },
    })

    await handleUpdateMockApi(client, config, {
      path: "/shop/users",
      count: 3,
      locale: "ko",
    })

    // 저장까지 덮어쓰면 웹 에디터에서도 설정이 사라진다
    const byName = Object.fromEntries(
      received.fieldDefs.map((f: any) => [f.name, f.fakerMethod]),
    )
    expect(byName.name).toBe("person.fullName")
    expect(byName.price).toBe("number.float")
  })

  it("schema 미지정이면 재생성에도 저장된 fieldDefs를 쓴다", async () => {
    const client = makeClient({ getItems: async () => [itemWithFakerDefs] })

    await handleUpdateMockApi(client, config, {
      path: "/shop/users",
      count: 3,
      locale: "ko",
    })

    const [fieldsArg] = generateCalls[0] as [any[]]
    const byName = Object.fromEntries(
      fieldsArg.map((f: any) => [f.name, f.fakerMethod]),
    )
    expect(byName.price).toBe("number.float")
  })

  it("schema를 명시하면 fieldDefs를 새로 만든다", async () => {
    let received: any
    const client = makeClient({
      getItems: async () => [itemWithFakerDefs],
      updateItem: async (p: any) => { received = p; return { isSuccess: true } },
    })

    await handleUpdateMockApi(client, config, {
      path: "/shop/users",
      schema: { title: "string" } as never,
      count: 3,
      locale: "ko",
    })

    // 스키마를 갈아치웠으므로 이전 faker 설정은 대응되는 필드가 없다
    expect(received.fieldDefs.map((f: any) => f.name)).toEqual(["id", "title"])
  })

  it("fakerHints는 보존된 fieldDefs 위에 덮어쓴다", async () => {
    let received: any
    const client = makeClient({
      getItems: async () => [itemWithFakerDefs],
      updateItem: async (p: any) => { received = p; return { isSuccess: true } },
    })

    await handleUpdateMockApi(client, config, {
      path: "/shop/users",
      count: 3,
      locale: "ko",
      // number 타입에 허용된 값이어야 한다. 아니면 applyFakerHints가 오류를 수집해
      // tool error가 되고 이 테스트는 fieldDefs를 검증하지 못한다.
      fakerHints: { price: "location.latitude" },
    })

    const byName = Object.fromEntries(
      received.fieldDefs.map((f: any) => [f.name, f.fakerMethod]),
    )
    // 힌트가 지정된 필드만 바뀌고 나머지는 유지된다
    expect(byName.price).toBe("location.latitude")
    expect(byName.name).toBe("person.fullName")
  })

  it("보존한 fieldDefs를 in-place 수정해도 저장된 원본을 오염시키지 않는다", async () => {
    const client = makeClient({ getItems: async () => [itemWithFakerDefs] })

    await handleUpdateMockApi(client, config, {
      path: "/shop/users",
      count: 3,
      locale: "ko",
      fakerHints: { price: "location.latitude" },
    })

    // applyFakerHints는 in-place로 고친다(schema-input.ts:38). 복제하지 않으면
    // 같은 프로세스에서 재사용되는 응답 객체가 변조된다.
    expect(itemWithFakerDefs.fieldDefs![1]!.fakerMethod).toBe("number.float")
  })
})

describe("handleUpdateMockApi — sort·search 옵션", () => {
  /** options를 가진 항목으로 교체한 클라이언트 */
  function clientWithOptions(options: any, updateItem: jest.Mock) {
    const withOptions = { ...item, options }
    return makeClient({
      getItems: async () => [withOptions],
      getItem: async () => withOptions,
      updateItem,
    })
  }

  it("sort를 지정하면 켜서 저장한다", async () => {
    const updateItem = jest.fn().mockResolvedValue({ isSuccess: true })
    const client = clientWithOptions({ pagination: false }, updateItem)

    await handleUpdateMockApi(client, config, {
      ...baseArgs,
      sort: { sortParam: "_sort", orderParam: "_order" },
    } as any)

    expect(updateItem.mock.calls[0][0].options.sort).toBe(true)
  })

  // 회귀 방지: 웹에서 켠 정렬·검색이 MCP 데이터 갱신 한 번에 사라지면 안 된다
  it("옵션 인자를 생략하면 웹에서 켜 둔 sort·search가 그대로 유지된다", async () => {
    const updateItem = jest.fn().mockResolvedValue({ isSuccess: true })
    const client = clientWithOptions(
      {
        pagination: true,
        paginationParams: { pageParam: "page", limitParam: "limit" },
        sort: true,
        sortParams: { sortParam: "_sort", orderParam: "_order" },
        search: true,
        searchParams: { searchParam: "q" },
      },
      updateItem
    )

    await handleUpdateMockApi(client, config, baseArgs)

    const sent = updateItem.mock.calls[0][0].options
    expect(sent.sort).toBe(true)
    expect(sent.search).toBe(true)
    expect(sent.pagination).toBe(true)
    expect(sent.searchParams).toEqual({ searchParam: "q" })
  })

  it("disableSort: true면 정렬만 끄고 검색은 남긴다", async () => {
    const updateItem = jest.fn().mockResolvedValue({ isSuccess: true })
    const client = clientWithOptions(
      { pagination: false, sort: true, search: true, searchParams: { searchParam: "q" } },
      updateItem
    )

    await handleUpdateMockApi(client, config, {
      ...baseArgs,
      disableSort: true,
    } as any)

    const sent = updateItem.mock.calls[0][0].options
    expect(sent.sort).toBe(false)
    expect(sent.search).toBe(true)
  })
})

