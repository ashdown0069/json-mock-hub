import { handleUpdateMockApi } from "../tools/update-mock-api"
import type { FileBrowserItemRes } from "../api-client"
import type { McpConfig } from "../config"

const generateCalls: unknown[][] = []
jest.mock("@workspace/mockgen/generateData", () => ({
  generateDummyData: (...args: unknown[]) => {
    generateCalls.push(args)
    return [{ title: "t1" }, { title: "t2" }]
  },
  generateSingleObjectData: (...args: unknown[]) => {
    generateCalls.push(args)
    return { title: "single-object" }
  },
}))

const config = {
  API_BASE_URL: "http://localhost:3000", MOCK_DOMAIN: "localhost:3000",
  MOCK_HUB_API_KEY: "k", MOCK_HUB_WORKSPACE_ID: "ws1",
} as McpConfig

const item: FileBrowserItemRes = {
  id: "u1", name: "users", itemType: "File", parentId: "f1", options: null,
  json: null, fields: [{ id: "f1", name: "name", type: "string" }],
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
    expect(received.fields.map((f: any) => f.name)).toEqual(["id", "name", "age"])
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
  it("updateItem에 전달되는 fields 최상위에 id: number가 주입된다", async () => {
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
    expect(sent.fields[0]).toMatchObject({ name: "id", type: "number" })
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
    expect(sent.fields[0].type).toBe("number")
  })

  it("빈 schema({}) 전달 시 truthy 방어로 tool error를 반환한다", async () => {
    const client = makeClient()
    const res = await handleUpdateMockApi(client, config, {
      path: "/shop/users",
      schema: {} as any,
      count: 2,
      locale: "ko",
    })
    expect(res.isError).toBe(true)
    expect((res.content[0] as any).text).toContain("유효한 스키마 필드가 없습니다")
  })

  it("저장된 fields가 비어있고 schema도 미지정이면 tool error를 반환한다", async () => {
    const emptyItem: FileBrowserItemRes = {
      ...item,
      fields: [],
    }
    const client = makeClient({ getItems: async () => [emptyItem] })
    const res = await handleUpdateMockApi(client, config, {
      path: "/shop/users",
      count: 2,
      locale: "ko",
    })
    expect(res.isError).toBe(true)
    expect((res.content[0] as any).text).toContain("유효한 스키마 필드가 없습니다")
  })
})

describe("handleUpdateMockApi — 부분 갱신", () => {
  const storedItem = {
    id: "2",
    name: "users",
    itemType: "File" as const,
    parentId: "1",
    path: "/shop/users",
    fields: [
      { id: "f1", name: "id", type: "number" },
      { id: "f2", name: "email", type: "string" },
    ],
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

    const sent = client.updateItem.mock.calls[0][0].fields
    expect(sent.find((f: any) => f.name === "email")).toBeDefined()
  })

  it("schema를 지정하면 기존 스키마를 완전히 대체한다", async () => {
    const client = createClient()

    await handleUpdateMockApi(client as never, testConfig, {
      path: "/shop/users",
      schema: { nickname: "string" },
      count: 5,
      locale: "ko",
    })

    const sent = client.updateItem.mock.calls[0][0].fields
    expect(sent.find((f: any) => f.name === "nickname")).toBeDefined()
    expect(sent.find((f: any) => f.name === "email")).toBeUndefined()
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
    client.getItem.mockResolvedValue({ ...storedItem, fields: null })

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
    fields: [
      { id: "f1", name: "name", type: "string", fakerMethod: "person.fullName" },
      { id: "f2", name: "price", type: "number", fakerMethod: "number.float" },
    ],
  }

  beforeEach(() => {
    generateCalls.length = 0
  })

  it("schema 미지정이면 저장된 fields의 faker 설정을 유지한다", async () => {
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
      received.fields.map((f: any) => [f.name, f.fakerMethod]),
    )
    expect(byName.name).toBe("person.fullName")
    expect(byName.price).toBe("number.float")
  })

  it("schema 미지정이면 재생성에도 저장된 fields를 쓴다", async () => {
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

  it("schema를 명시하면 fields를 새로 만든다", async () => {
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
    expect(received.fields.map((f: any) => f.name)).toEqual(["id", "title"])
  })

  it("fakerHints는 보존된 fields 위에 덮어쓴다", async () => {
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
      // tool error가 되고 이 테스트는 fields를 검증하지 못한다.
      fakerHints: { price: "location.latitude" },
    })

    const byName = Object.fromEntries(
      received.fields.map((f: any) => [f.name, f.fakerMethod]),
    )
    // 힌트가 지정된 필드만 바뀌고 나머지는 유지된다
    expect(byName.price).toBe("location.latitude")
    expect(byName.name).toBe("person.fullName")
  })

  it("보존한 fields를 in-place 수정해도 저장된 원본을 오염시키지 않는다", async () => {
    const client = makeClient({ getItems: async () => [itemWithFakerDefs] })

    await handleUpdateMockApi(client, config, {
      path: "/shop/users",
      count: 3,
      locale: "ko",
      fakerHints: { price: "location.latitude" },
    })

    // applyFakerHints는 in-place로 고친다(schema-input.ts:38). 복제하지 않으면
    // 같은 프로세스에서 재사용되는 응답 객체가 변조된다.
    expect(itemWithFakerDefs.fields![1]!.fakerMethod).toBe("number.float")
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

  it("단일 객체(resourceType: 'object') API 갱신 시 withIdField를 생략하고 generateSingleObjectData로 단일 객체를 보존한다", async () => {
    const updateItem = jest.fn().mockResolvedValue({ isSuccess: true })
    const singleObjectItem: FileBrowserItemRes = {
      id: "s1",
      name: "settings",
      itemType: "File",
      parentId: null,
      options: { resourceType: "object", pagination: false, sort: false, search: false },
      fields: [
        { id: "f1", name: "id", type: "uuid" },
        { id: "f2", name: "theme", type: "string" },
      ],
      json: { id: "u-1", theme: "light" },
      path: "/settings",
      depth: 0,
      workspace: "ws1",
    }
    const client = {
      getItems: async () => [singleObjectItem],
      getItem: async () => singleObjectItem,
      updateItem,
    } as any

    const res = await handleUpdateMockApi(client, config, {
      path: "/settings",
      schema: { id: "uuid", theme: "string", fontSize: "number" } as any,
      count: 1,
      locale: "ko",
    })

    expect(updateItem).toHaveBeenCalledTimes(1)
    const sent = updateItem.mock.calls[0][0]
    // withIdField가 강제 적용되어 id가 'number'로 덮어써지지 않고 'uuid' 유지
    expect(sent.fields.find((f: any) => f.name === "id")?.type).toBe("uuid")
    expect(sent.fields.find((f: any) => f.name === "fontSize")?.type).toBe("number")
    expect(sent.json).toEqual({ title: "single-object" })

    const text = (res.content[0] as any).text
    expect(text).toContain("(단일 객체 모드)")
    expect(text).toContain("- 단일 객체 URL:")
    expect(text).toContain("- 단건 조회/수정/삭제:")
  })

  it("컬렉션 모드 갱신 시 단건조회, 페이지네이션, 정렬, 검색 URL 안내가 정상 출력된다 (1위 결함 수정)", async () => {
    const updateItem = jest.fn().mockResolvedValue({ isSuccess: true })
    const client = makeClient({
      updateItem,
    })

    const res = await handleUpdateMockApi(client, config, {
      path: "/shop/users",
      schema: { name: "string" },
      count: 2,
      locale: "ko",
      pagination: { pageParam: "page", limitParam: "limit" },
      sort: { sortParam: "sort", orderParam: "order" },
      search: { searchParam: "q" },
    })

    const text = (res.content[0] as any).text
    expect(text).toContain("- 컬렉션 URL: http://ws1.localhost:3000/api/shop/users")
    expect(text).toContain("- 단건 조회: http://ws1.localhost:3000/api/shop/users/{id}")
    expect(text).toContain("- 페이지네이션: http://ws1.localhost:3000/api/shop/users?page=1&limit=10 (limit 최대 100)")
    expect(text).toContain("- 정렬: http://ws1.localhost:3000/api/shop/users?sort=<field>&order=asc")
    expect(text).toContain("- 전문검색: http://ws1.localhost:3000/api/shop/users?q=<query>")
    expect(text).toContain("샘플 데이터 (2건):")
  })

  it("컬렉션 API를 단일 객체(resourceType: 'object')로 전환 시 옵션이 초기화되고 단일 객체로 갱신된다 (7위)", async () => {
    const updateItem = jest.fn().mockResolvedValue({ isSuccess: true })
    const collectionItem: FileBrowserItemRes = {
      ...item,
      options: {
        resourceType: "collection",
        pagination: true,
        paginationParams: { pageParam: "page", limitParam: "limit" },
        sort: true,
        sortParams: { sortParam: "sort", orderParam: "order" },
      },
    }
    const client = {
      getItems: async () => [collectionItem],
      getItem: async () => collectionItem,
      updateItem,
    } as any

    const res = await handleUpdateMockApi(client, config, {
      path: "/shop/users",
      resourceType: "object",
      count: 1,
      locale: "ko",
    })

    expect(updateItem).toHaveBeenCalledTimes(1)
    const sent = updateItem.mock.calls[0][0]
    expect(sent.options.resourceType).toBe("object")
    expect(sent.options.pagination).toBe(false)
    expect(sent.options.sort).toBe(false)
    expect(sent.options.paginationParams).toBeUndefined()
    expect(sent.json).toEqual({ title: "single-object" })

    const text = (res.content[0] as any).text
    expect(text).toContain("(단일 객체 모드)")
    expect(text).toContain("- 단일 객체 URL:")
  })

  it("단일 객체 API를 컬렉션(resourceType: 'collection')으로 전환 시 id 필드가 주입되고 배열 데이터로 갱신된다 (7위)", async () => {
    const updateItem = jest.fn().mockResolvedValue({ isSuccess: true })
    const singleItem: FileBrowserItemRes = {
      id: "s1",
      name: "profile",
      itemType: "File",
      parentId: null,
      options: { resourceType: "object", pagination: false, sort: false, search: false },
      fields: [{ id: "f1", name: "nickname", type: "string" }, { id: "f2", name: "bio", type: "string" }],
      json: { nickname: "alice", bio: "hello" },
      path: "/profile",
      depth: 0,
      workspace: "ws1",
    }
    const client = {
      getItems: async () => [singleItem],
      getItem: async () => singleItem,
      updateItem,
    } as any

    const res = await handleUpdateMockApi(client, config, {
      path: "/profile",
      resourceType: "collection",
      count: 5,
      locale: "ko",
    })

    expect(updateItem).toHaveBeenCalledTimes(1)
    const sent = updateItem.mock.calls[0][0]
    expect(sent.options.resourceType).toBe("collection")
    // 컬렉션으로 바뀌었으므로 최상위 id가 주입됨
    expect(sent.fields[0]).toMatchObject({ name: "id", type: "number" })
    expect(sent.fields.find((f: any) => f.name === "nickname")).toBeDefined()
    // 배열 더미 데이터 생성됨
    expect(Array.isArray(sent.json)).toBe(true)

    const text = (res.content[0] as any).text
    expect(text).toContain("mock API가 갱신되었습니다: /profile")
    expect(text).not.toContain("(단일 객체 모드)")
    expect(text).toContain("- 컬렉션 URL:")
    expect(text).toContain("- 단건 조회:")
  })
})

