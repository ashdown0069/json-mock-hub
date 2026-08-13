import { z } from "zod"
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { resolveMockApiParams, type FieldSchema } from "@workspace/types"
import type { ApiClient } from "../api-client"
import type { McpConfig } from "../config"
import { findFullItemByPath } from "../resolve"
import { getMockApiBaseUrl } from "../mock-url"
import { toolText, toolError, type ToolResult } from "../tool-result"
import { withApiErrors } from "../tool-errors"

// LLM 컨텍스트를 아끼기 위한 미리보기 건수. 전체 데이터는 mock URL로 직접 받게 한다.
const PREVIEW_COUNT = 2

/**
 * fieldDefs에서 사용자가 실제로 지정한 faker 메서드만 dot-path로 추린다.
 * "none"은 schemaToFields가 모든 필드에 넣는 기본값이라 보여줄 정보가 없다.
 */
function collectFakerHints(
  fields: FieldSchema[] | null | undefined,
  prefix = ""
): string[] {
  if (!fields) return []
  const out: string[] = []
  for (const field of fields) {
    const dotPath = prefix ? `${prefix}.${field.name}` : field.name
    if (field.fakerMethod && field.fakerMethod !== "none") {
      out.push(`- ${dotPath}: ${field.fakerMethod}`)
    }
    out.push(...collectFakerHints(field.fields, dotPath))
  }
  return out
}

export async function handleDescribeMockApi(
  client: ApiClient,
  config: McpConfig,
  { path, includeData }: { path: string; includeData: boolean }
): Promise<ToolResult> {
  // 저장된 schema/fieldDefs가 필요하므로 단건 전체를 가져온다
  const item = await findFullItemByPath(client, path)
  if (!item) {
    return toolError(
      `"${path}" 경로의 항목을 찾을 수 없습니다. list_mock_apis로 경로를 확인하세요.`
    )
  }
  if (item.itemType !== "File") {
    return toolError(`"${path}"는 폴더입니다. mock API(File) 경로를 지정하세요.`)
  }

  const params = resolveMockApiParams(item.options)
  const mockUrl = `${getMockApiBaseUrl(item.workspace, config.MOCK_DOMAIN)}${item.path}`

  const lines = [
    `# ${item.path}`,
    `- 컬렉션 URL: ${mockUrl}`,
    `- 페이지네이션: ${
      params.pagination
        ? `켜짐 (?${params.pagination.pageParam}=1&${params.pagination.limitParam}=10)`
        : "꺼짐"
    }`,
    `- 정렬: ${
      params.sort
        ? `켜짐 (?${params.sort.sortParam}=필드명&${params.sort.orderParam}=asc|desc)`
        : "꺼짐"
    }`,
    `- 전문검색: ${
      params.search ? `켜짐 (?${params.search.searchParam}=검색어)` : "꺼짐"
    }`,
    "",
    "## 저장된 스키마",
    "```json",
    JSON.stringify(item.schema ?? {}, null, 2),
    "```",
  ]

  const hints = collectFakerHints(item.fieldDefs)
  if (hints.length > 0) {
    lines.push("", "## Faker 설정", ...hints)
  }

  if (includeData) {
    const effective = await client.getEffectiveJson(item.path)
    lines.push(
      "",
      `## 런타임 실효 데이터 (총 ${effective.length}건 중 앞 ${Math.min(
        PREVIEW_COUNT,
        effective.length
      )}건)`,
      "```json",
      JSON.stringify(effective.slice(0, PREVIEW_COUNT), null, 2),
      "```"
    )
  }

  return toolText(lines.join("\n"))
}

export function registerDescribeMockApi(
  server: McpServer,
  client: ApiClient,
  config: McpConfig
) {
  server.registerTool(
    "describe_mock_api",
    {
      title: "Mock API 상세 정보 조회",
      description:
        "경로로 mock API의 저장된 스키마, Faker 메서드 설정, 활성화된 옵션(페이지네이션/정렬/검색), 호출 URL을 상세 조회합니다. " +
        "update_mock_api를 호출하기 전에 기존 스키마를 확인하거나 mock API 구조를 파악할 때 사용하세요. " +
        "includeData: true를 함께 지정하면 CUD 편집이 반영된 런타임 실효 데이터 샘플도 함께 받아옵니다.",
      annotations: { readOnlyHint: true, destructiveHint: false },
      inputSchema: {
        path: z.string().describe("조회할 mock API 경로 (예: /shop/users)"),
        includeData: z
          .boolean()
          .default(false)
          .describe("true면 런타임 실효 데이터 샘플(앞 2건)도 함께 반환합니다."),
      },
    },
    async (args) =>
      withApiErrors(() => handleDescribeMockApi(client, config, args))
  )
}
