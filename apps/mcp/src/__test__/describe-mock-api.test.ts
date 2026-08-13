import { handleDescribeMockApi } from "../tools/describe-mock-api"
import type { FileBrowserItemRes } from "../api-client"
import type { McpConfig } from "../config"

const config = {
  API_BASE_URL: "http://localhost:3000",
  MOCK_DOMAIN: "localhost:3000",
  MOCK_HUB_API_KEY: "k",
  MOCK_HUB_WORKSPACE_ID: "ws1",
} as McpConfig

const item: FileBrowserItemRes = {
  id: "u1",
  name: "users",
  itemType: "File",
  parentId: "f1",
  options: { pagination: true, sort: true, sortParams: { sortParam: "_sort", orderParam: "_order" } },
  json: [{ id: 1 }],
  schema: { id: "number", email: "string" },
  fieldDefs: [
    { name: "id", type: "number", fakerMethod: "none" },
    { name: "email", type: "string", fakerMethod: "internet.email" },
    {
      name: "author",
      type: "object",
      fakerMethod: "none",
      fields: [{ name: "nick", type: "string", fakerMethod: "person.firstName" }],
    },
  ] as never,
  path: "/shop/users",
  depth: 1,
  workspace: "ws1",
}

function makeClient(over: Record<string, unknown> = {}) {
  return {
    getItems: async () => [item],
    getItem: async () => item,
    getEffectiveJson: async () => [{ id: 1 }, { id: 2 }, { id: 3 }],
    ...over,
  } as never
}

const textOf = (result: { content: { text: string }[] }) =>
  result.content[0]?.text ?? ""

describe("handleDescribeMockApi", () => {
  it("저장된 스키마를 그대로 보여준다 (update 전에 LLM이 읽을 원본)", async () => {
    const result = await handleDescribeMockApi(makeClient(), config, {
      path: "/shop/users",
      includeData: false,
    })

    expect(textOf(result)).toContain('"email": "string"')
  })

  it("켜진 옵션은 실제 파라미터명과 함께, 꺼진 옵션은 '꺼짐'으로 표시한다", async () => {
    const text = textOf(
      await handleDescribeMockApi(makeClient(), config, {
        path: "/shop/users",
        includeData: false,
      })
    )

    expect(text).toContain("_sort")
    expect(text).toContain("전문검색: 꺼짐")
  })

  it("사용자가 지정한 faker 메서드만 dot-path로 나열한다", async () => {
    const text = textOf(
      await handleDescribeMockApi(makeClient(), config, {
        path: "/shop/users",
        includeData: false,
      })
    )

    expect(text).toContain("- email: internet.email")
    expect(text).toContain("- author.nick: person.firstName")
    // "none"은 schemaToFields의 기본값이라 정보가 없다
    expect(text).not.toContain("- id: none")
  })

  it("includeData: true면 저장 json이 아니라 실효 데이터를 조회해 앞 2건만 보여준다", async () => {
    let called = 0
    const client = makeClient({
      getEffectiveJson: async () => {
        called += 1
        return [{ id: 1 }, { id: 2 }, { id: 3 }]
      },
    })

    const text = textOf(
      await handleDescribeMockApi(client, config, {
        path: "/shop/users",
        includeData: true,
      })
    )

    expect(called).toBe(1)
    expect(text).toContain("총 3건")
    expect(text).toContain('"id": 2')
    expect(text).not.toContain('"id": 3')
  })

  it("includeData: false면 실효 데이터를 조회하지 않는다", async () => {
    let called = 0
    const client = makeClient({
      getEffectiveJson: async () => {
        called += 1
        return []
      },
    })

    await handleDescribeMockApi(client, config, {
      path: "/shop/users",
      includeData: false,
    })

    expect(called).toBe(0)
  })

  it("폴더 경로면 tool error를 반환한다", async () => {
    const folder = { ...item, itemType: "Folder" as const }
    const client = makeClient({
      getItems: async () => [folder],
      getItem: async () => folder,
    })

    const result = await handleDescribeMockApi(client, config, {
      path: "/shop/users",
      includeData: false,
    })

    expect(result.isError).toBe(true)
  })
})
