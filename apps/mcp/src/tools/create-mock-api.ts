import { z } from "zod"
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { schemaToFields } from "@workspace/mockgen/convertSchema"
import { generateDummyData } from "@workspace/mockgen/generateData"
import type { SchemaObject } from "@workspace/types"
import type { ApiClient } from "../api-client"
import type { McpConfig } from "../config"
import { getMockApiBaseUrl } from "../mock-url"
import { schemaObjectInput, applyFakerHints } from "../schema-input"
import { toolText, toolError, formatApiError, type ToolResult } from "../tool-result"
import { findItemByPath, normalizePath } from "../resolve"

// CreateItemDto의 ITEM_NAME_REGEX와 동일 규칙으로 선검증
export const ITEM_NAME_REGEX = /^[a-zA-Z0-9가-힣_-]+$/

interface CreateArgs {
  name: string
  schema: SchemaObject
  parentPath: string
  count: number
  locale: "ko" | "en"
  fakerHints?: Record<string, string>
  pagination?: { pageParam: string; limitParam: string }
}

export async function handleCreateMockApi(
  client: ApiClient,
  config: McpConfig,
  { name, schema, parentPath, count, locale, fakerHints, pagination }: CreateArgs
): Promise<ToolResult> {
  const fieldDefs = schemaToFields(schema)

  if (fakerHints) {
    const { errors } = applyFakerHints(fieldDefs, fakerHints)
    if (errors.length > 0) {
      return toolError(`fakerHints 오류:\n- ${errors.join("\n- ")}`)
    }
  }

  // 루트가 아니면 부모 폴더 경로를 실제 폴더 id로 해석한다 (id는 내부에서만 사용)
  let parentId: string | null = null
  if (normalizePath(parentPath) !== "/") {
    let items
    try {
      items = await client.getItems()
    } catch (error) {
      return formatApiError(error)
    }
    const parent = findItemByPath(items, parentPath)
    if (!parent || parent.itemType !== "Folder") {
      return toolError(
        `부모 폴더 경로 "${parentPath}"를 찾을 수 없습니다. list_mock_apis로 폴더 경로를 확인하세요.`
      )
    }
    parentId = parent.id
  }

  const json = generateDummyData(fieldDefs, count, locale)
  const options = pagination
    ? { pagination: true, paginationParams: pagination }
    : { pagination: false }

  try {
    const created = await client.createItem({
      name,
      itemType: "File",
      parentId,
      schema,
      json,
      options,
      fieldDefs,
    })

    const mockUrl = `${getMockApiBaseUrl(config.MOCK_HUB_WORKSPACE_ID, config.MOCK_DOMAIN)}${created.path}`
    const lines = [
      "mock API가 생성되었습니다.",
      `- 경로: ${created.path}`,
      `- 컬렉션 URL: ${mockUrl}`,
      `- 단건 조회: ${mockUrl}/{id}`,
    ]
    if (pagination) {
      lines.push(
        `- 페이지네이션: ${mockUrl}?${pagination.pageParam}=1&${pagination.limitParam}=10 (limit 최대 100)`
      )
    }
    lines.push("", "샘플 데이터 (앞 2건):", "```json")
    lines.push(JSON.stringify(json.slice(0, 2), null, 2), "```")
    return toolText(lines.join("\n"))
  } catch (error) {
    return formatApiError(error)
  }
}

export function registerCreateMockApi(
  server: McpServer,
  client: ApiClient,
  config: McpConfig
) {
  server.registerTool(
    "create_mock_api",
    {
      title: "Mock API 생성",
      description:
        "스키마 정의로부터 mock 데이터를 생성해 워크스페이스에 mock API를 만들고 호출 가능한 URL을 반환합니다. " +
        '스키마 값 타입: "string" | "number" | "boolean" | "date" | "uuid" | "objectId" | { "type": "array", "items": <타입> } | 중첩 객체',
      inputSchema: {
        name: z
          .string()
          .regex(
            ITEM_NAME_REGEX,
            "이름은 한글/영문/숫자/하이픈/언더바만 사용할 수 있습니다."
          )
          .describe("리소스 이름 (URL 경로가 됨, 예: products)"),
        schema: schemaObjectInput,
        parentPath: z
          .string()
          .default("/")
          .describe("배치할 폴더 경로 (기본 루트 '/', list_mock_apis로 확인)"),
        count: z
          .number()
          .int()
          .min(1)
          .max(50)
          .default(10)
          .describe("생성할 mock 데이터 건수"),
        locale: z.enum(["ko", "en"]).default("ko"),
        fakerHints: z
          .record(z.string())
          .optional()
          .describe(
            '필드 dot-path → faker 메서드. 예: { "price": "commerce.price", "author.name": "person.fullName" }'
          ),
        pagination: z
          .object({
            pageParam: z.string().default("page"),
            limitParam: z.string().default("limit"),
          })
          .optional()
          .describe("지정하면 페이지네이션 활성화"),
      },
    },
    async (args) => handleCreateMockApi(client, config, args)
  )
}
