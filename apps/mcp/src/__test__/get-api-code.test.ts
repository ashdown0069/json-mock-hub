import { handleGetApiCode } from "../tools/get-api-code"
import type { FileBrowserItemRes } from "../api-client"
import type { McpConfig } from "../config"

const config = {
  API_BASE_URL: "http://localhost:3000",
  MOCK_DOMAIN: "localhost:3000",
  MOCK_HUB_API_KEY: "k",
  MOCK_HUB_WORKSPACE_ID: "ws1",
} as McpConfig

const fileItem: FileBrowserItemRes = {
  id: "u1", name: "users", itemType: "File", parentId: null, options: null,
  json: null, schema: { name: "string", age: "number" }, fieldDefs: null,
  path: "/users", depth: 0, workspace: "ws1",
}

const full = { path: "/users", lang: "ts", clientMode: "fetch+query", validation: "zod" } as const
const clientOf = (over: any = {}) => {
  const getItems = over.getItems ?? (async () => [fileItem])
  const getItem = over.getItem ?? (async (id: string) => {
    const list = await getItems()
    return list.find((it: any) => it.id === id) ?? null
  })
  return { getItems, getItem, ...over } as any
}
const textOf = (res: any) => res.content[0].text as string

describe("handleGetApiCode 가드", () => {
  it("존재하지 않는 경로면 tool error", async () => {
    const res = await handleGetApiCode(clientOf({ getItems: async () => [] }), config, full)
    expect(res.isError).toBe(true)
  })
  it("폴더 경로면 tool error", async () => {
    const res = await handleGetApiCode(
      clientOf({ getItems: async () => [{ ...fileItem, itemType: "Folder" }] }), config, full)
    expect(res.isError).toBe(true)
    expect(textOf(res)).toContain("폴더")
  })
  it("스키마가 없으면 tool error", async () => {
    const res = await handleGetApiCode(
      clientOf({ getItems: async () => [{ ...fileItem, schema: null }] }), config, full)
    expect(res.isError).toBe(true)
  })
})

describe("handleGetApiCode 생성", () => {
  it("ts/fetch+query/zod면 타입·클라이언트·훅·검증 4종을 참고 문구와 함께 반환한다", async () => {
    const text = textOf(await handleGetApiCode(clientOf(), config, full))
    expect(text).toContain("참고용 완제품")
    expect(text).toContain("export interface Users") // 타입(ts)
    expect(text).toContain("react-query")            // 훅(+query)
    expect(text).toContain('import { z } from "zod"') // zod
  })
  it("clientMode=fetch(쿼리 없음)면 react-query 섹션을 넣지 않는다", async () => {
    const text = textOf(await handleGetApiCode(clientOf(), config, { ...full, clientMode: "fetch" }))
    expect(text).not.toContain("react-query")
  })
  it("lang=js면 interface 타입 섹션을 넣지 않는다", async () => {
    const text = textOf(await handleGetApiCode(clientOf(), config, { ...full, lang: "js" }))
    expect(text).not.toContain("export interface")
  })
  it("validation=none이면 검증 섹션을 넣지 않는다", async () => {
    const text = textOf(await handleGetApiCode(clientOf(), config, { ...full, validation: "none" }))
    expect(text).not.toContain("검증 스키마")
  })
})

describe("handleGetApiCode 옵션 선택(elicit)", () => {
  it("옵션이 빠지면 빠진 것만 elicit해서 채운다", async () => {
    let asked: string[] = []
    const elicit = async (missing: string[]) => {
      asked = missing
      return { lang: "ts", clientMode: "axios+query", validation: "joi" } as any
    }
    const text = textOf(await handleGetApiCode(clientOf(), config, { path: "/users" }, elicit))
    expect([...asked].sort()).toEqual(["clientMode", "lang", "validation"])
    expect(text).toContain("Joi") // joi 검증 코드 흔적
  })
  it("사용자가 일부만 지정하면 빠진 항목만 elicit한다", async () => {
    let asked: string[] = []
    const elicit = async (missing: string[]) => { asked = missing; return { validation: "zod" } as any }
    await handleGetApiCode(clientOf(), config, { path: "/users", lang: "ts", clientMode: "fetch" }, elicit)
    expect(asked).toEqual(["validation"])
  })
  it("elicit이 없으면(미지원) 사용자에게 물어보라는 안내를 반환한다", async () => {
    const text = textOf(await handleGetApiCode(clientOf(), config, { path: "/users" }))
    expect(text).toContain("옵션")
    expect(text).toContain("다시 호출")
  })
})



describe("handleGetApiCode — elicitInput 실패 처리", () => {
  const item = {
    id: "2",
    name: "users",
    itemType: "File" as const,
    parentId: null,
    path: "/users",
    schema: { id: "number" },
    options: null,
  }

  const createClient = () => ({
    getItems: jest.fn().mockResolvedValue([item]),
    getItem: jest.fn().mockResolvedValue(item),
  })

  const elicitConfig = {
    MOCK_HUB_WORKSPACE_ID: "ws1",
    MOCK_DOMAIN: "localhost:4001",
  } as never

  const textOf = (result: { content: { text: string }[] }) =>
    result.content[0]?.text ?? ""

  it("elicit이 예외를 던져도 전파하지 않고 안내 폴백을 반환한다", async () => {
    const elicit = jest.fn().mockRejectedValue(new Error("Request timed out"))

    const result = await handleGetApiCode(
      createClient() as never,
      elicitConfig,
      { path: "/users" },
      elicit
    )

    expect(textOf(result)).toContain("다시 호출")
  })

  it("elicit이 null을 반환해도 안내 폴백을 반환한다", async () => {
    const elicit = jest.fn().mockResolvedValue(null)

    const result = await handleGetApiCode(
      createClient() as never,
      elicitConfig,
      { path: "/users" },
      elicit
    )

    expect(textOf(result)).toContain("다시 호출")
  })

  it("elicit이 값을 주면 코드를 생성한다", async () => {
    const elicit = jest.fn().mockResolvedValue({
      lang: "ts",
      clientMode: "axios",
      validation: "zod",
    })

    const result = await handleGetApiCode(
      createClient() as never,
      elicitConfig,
      { path: "/users" },
      elicit
    )

    expect(textOf(result)).toContain("## 타입")
  })
})

