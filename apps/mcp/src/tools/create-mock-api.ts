import { z } from "zod"
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { schemaToFields, withIdField } from "@workspace/mockgen/convertSchema"
import { generateDummyData } from "@workspace/mockgen/generateData"
import { resolveMockApiParams, type SchemaObject } from "@workspace/types"
import type { ApiClient } from "../api-client"
import type { McpConfig } from "../config"
import { ensureFolderPath } from "../folder-path"
import {
  buildMockApiOptions,
  mockApiOptionInputShape,
} from "../mock-api-options"
import { getMockApiBaseUrl } from "../mock-url"
import { schemaObjectInput, SCHEMA_VALUE_TYPES_HINT, applyFakerHints } from "../schema-input"
import { toolText, toolError, type ToolResult } from "../tool-result"
import { withApiErrors } from "../tool-errors"
import { findItemByPath, normalizePath } from "../resolve"
import { ITEM_NAME_REGEX } from "../item-name"

interface CreateArgs {
  name: string
  schema: SchemaObject
  parentPath: string
  count: number
  locale: "ko" | "en"
  fakerHints?: Record<string, string>
  pagination?: { pageParam: string; limitParam: string }
  sort?: { sortParam: string; orderParam: string }
  search?: { searchParam: string }
  /** 부모 폴더가 없을 때 자동으로 만든다 (없으면 오류) */
  createParents?: boolean
}

export async function handleCreateMockApi(
  client: ApiClient,
  config: McpConfig,
  {
    name,
    schema,
    parentPath,
    count,
    locale,
    fakerHints,
    pagination,
    sort,
    search,
    createParents,
  }: CreateArgs
): Promise<ToolResult> {
  // 예약 필드 id를 스키마 최상위에 강제 주입한다 (웹 생성 흐름과 동일 계약)
  const schemaWithId = withIdField(schema)
  const fieldDefs = schemaToFields(schemaWithId)

  if (fakerHints) {
    const { errors } = applyFakerHints(fieldDefs, fakerHints)
    if (errors.length > 0) {
      return toolError(`fakerHints 오류:\n- ${errors.join("\n- ")}`)
    }
  }

  // 부모 해석과 대소문자 충돌 검사 모두 현재 목록이 필요하다 — 한 번만 조회한다
  const items = await client.getItems()

  // 루트가 아니면 부모 폴더 경로를 실제 폴더 id로 해석한다 (id는 내부에서만 사용)
  let parentId: string | null = null
  if (normalizePath(parentPath) !== "/") {
    const parent = findItemByPath(items, parentPath)
    if (parent) {
      if (parent.itemType !== "Folder") {
        return toolError(
          `"${parentPath}"는 mock API(File)입니다. parentPath에는 폴더 경로를 지정하세요.`
        )
      }
      parentId = parent.id
    } else if (createParents) {
      const ensured = await ensureFolderPath(client, items, parentPath)
      if (!ensured.ok) return toolError(ensured.error)
      parentId = ensured.parentId
    } else {
      return toolError(
        `부모 폴더 경로 "${parentPath}"를 찾을 수 없습니다. ` +
          `createParents: true로 다시 호출하면 자동으로 만들고, 폴더만 먼저 만들려면 create_folder를 사용하세요.`
      )
    }
  }

  // API의 중복 검사와 unique 인덱스는 대소문자를 구분한다. /products가 있는데
  // "Products"를 만들면 생성은 성공하지만 이후 경로 지정이 두 항목 사이에서
  // 모호해져 삭제·갱신이 엉뚱한 쪽에 적용된다. 만들기 전에 막는다.
  const lowered = name.toLowerCase()
  const clash = items.find(
    (item) => item.parentId === parentId && item.name.toLowerCase() === lowered
  )
  if (clash) {
    return toolError(
      `같은 폴더에 대소문자만 다른 "${clash.name}"이(가) 이미 있습니다. ` +
        `대소문자만 다른 동명 항목은 이후 경로 지정이 모호해지므로 만들 수 없습니다. 다른 이름을 사용하세요.`
    )
  }

  const json = generateDummyData(fieldDefs, count, locale)
  const options = buildMockApiOptions(null, { pagination, sort, search })

  const created = await client.createItem({
    name,
    itemType: "File",
    parentId,
    schema: schemaWithId as SchemaObject,
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

  const params = resolveMockApiParams(options)
  if (params.pagination) {
    lines.push(
      `- 페이지네이션: ${mockUrl}?${params.pagination.pageParam}=1&${params.pagination.limitParam}=10 (limit 최대 100)`
    )
  }
  if (params.sort) {
    lines.push(
      `- 정렬: ${mockUrl}?${params.sort.sortParam}=필드명&${params.sort.orderParam}=asc`
    )
  }
  if (params.search) {
    lines.push(`- 전문검색: ${mockUrl}?${params.search.searchParam}=검색어`)
  }

  lines.push("", "샘플 데이터 (앞 2건):", "```json")
  lines.push(JSON.stringify(json.slice(0, 2), null, 2), "```")
  return toolText(lines.join("\n"))
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
        SCHEMA_VALUE_TYPES_HINT +
        " 최상위 id 필드는 자동으로 number 자동 증가(1,2,3…)로 추가되므로 스키마에 정의할 필요가 없습니다.",
      annotations: { readOnlyHint: false, destructiveHint: false },
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
          .describe(
            "배치할 폴더 경로 (기본 루트 '/'). 없는 폴더면 createParents: true를 함께 지정하세요."
          ),
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
        ...mockApiOptionInputShape,
        createParents: z
          .boolean()
          .default(false)
          .describe(
            "parentPath의 폴더가 없으면 자동으로 만듭니다. 중간 폴더도 함께 생성합니다."
          ),
      },
    },
    async (args) => withApiErrors(() => handleCreateMockApi(client, config, args))
  )
}
