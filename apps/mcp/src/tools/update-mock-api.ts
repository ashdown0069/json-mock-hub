import { z } from "zod"
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { schemaToFields } from "@workspace/mockgen/convertSchema"
import { generateDummyData } from "@workspace/mockgen/generateData"
import type { SchemaObject } from "@workspace/types"
import type { ApiClient } from "../api-client"
import type { McpConfig } from "../config"
import { getMockApiBaseUrl } from "../mock-url"
import { schemaObjectInput, applyFakerHints } from "../schema-input"
import { toolText, toolError, formatApiError } from "../tool-result"
import { findItemByPath } from "../resolve"

interface UpdateArgs {
  path: string
  schema: SchemaObject
  count: number
  locale: "ko" | "en"
  fakerHints?: Record<string, string>
  pagination?: { pageParam: string; limitParam: string }
}

export async function handleUpdateMockApi(
  client: ApiClient,
  config: McpConfig,
  { path, schema, count, locale, fakerHints, pagination }: UpdateArgs
) {
  let items
  try {
    items = await client.getItems()
  } catch (error) {
    return formatApiError(error)
  }

  const item = findItemByPath(items, path)
  if (!item) {
    return toolError(
      `"${path}" 경로의 항목을 찾을 수 없습니다. list_mock_apis로 경로를 확인하세요.`
    )
  }
  if (item.itemType !== "File") {
    return toolError(`"${path}"는 폴더입니다. mock API(File) 경로를 지정하세요.`)
  }

  const fieldDefs = schemaToFields(schema)
  if (fakerHints) {
    const { errors } = applyFakerHints(fieldDefs, fakerHints)
    if (errors.length > 0) {
      return toolError(`fakerHints 오류:\n- ${errors.join("\n- ")}`)
    }
  }

  const json = generateDummyData(fieldDefs, count, locale)
  const options = pagination
    ? { pagination: true, paginationParams: pagination }
    : { pagination: false }

  try {
    // 이름·위치는 그대로 두고 스키마·데이터만 갱신한다 (id는 내부에서만 사용)
    await client.updateItem({
      itemId: item.id,
      name: item.name,
      itemType: "File",
      parentId: item.parentId,
      schema,
      json,
      options,
      fieldDefs,
    })

    const mockUrl = `${getMockApiBaseUrl(config.MOCK_HUB_WORKSPACE_ID, config.MOCK_DOMAIN)}${item.path}`
    const lines = [
      `mock API가 갱신되었습니다: ${item.path}`,
      `- 컬렉션 URL: ${mockUrl}`,
      "",
      "샘플 데이터 (앞 2건):",
      "```json",
      JSON.stringify(json.slice(0, 2), null, 2),
      "```",
    ]
    return toolText(lines.join("\n"))
  } catch (error) {
    return formatApiError(error)
  }
}

export function registerUpdateMockApi(
  server: McpServer,
  client: ApiClient,
  config: McpConfig
) {
  server.registerTool(
    "update_mock_api",
    {
      title: "Mock API 갱신",
      description:
        "경로로 지정한 mock API의 스키마로부터 mock 데이터를 새로 생성해 갱신합니다(이름·위치는 유지). 경로는 list_mock_apis로 확인하세요. " +
        '스키마 값 타입: "string" | "number" | "boolean" | "date" | "uuid" | "objectId" | { "type": "array", "items": <타입> } | 중첩 객체',
      inputSchema: {
        path: z.string().describe("갱신할 mock API 경로 (예: /shop/users)"),
        schema: schemaObjectInput,
        count: z.number().int().min(1).max(50).default(10).describe("생성할 mock 데이터 건수"),
        locale: z.enum(["ko", "en"]).default("ko"),
        fakerHints: z
          .record(z.string())
          .optional()
          .describe('필드 dot-path → faker 메서드. 예: { "author.name": "person.fullName" }'),
        pagination: z
          .object({
            pageParam: z.string().default("page"),
            limitParam: z.string().default("limit"),
          })
          .optional()
          .describe("지정하면 페이지네이션 활성화"),
      },
    },
    async (args) => handleUpdateMockApi(client, config, args)
  )
}
