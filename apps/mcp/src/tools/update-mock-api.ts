import { z } from "zod"
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import {
  fieldsToSchema,
  normalizeFields,
  schemaToFields,
  withIdField,
} from "@workspace/mockgen/convertSchema"
import {
  generateDummyData,
  generateSingleObjectData,
} from "@workspace/mockgen/generateData"
import {
  resolveMockApiParams,
  type MockResourceType,
  type SchemaObject,
} from "@workspace/types"
import type { ApiClient } from "../api-client"
import type { McpConfig } from "../config"
import {
  buildMockApiOptions,
  mockApiDisableInputShape,
  mockApiOptionInputShape,
} from "../mock-api-options"
import { getMockApiBaseUrl } from "../mock-url"
import { schemaObjectInput, SCHEMA_VALUE_TYPES_HINT, applyFakerHints } from "../schema-input"
import { toolText, toolError } from "../tool-result"
import { findFullItemByPath } from "../resolve"
import { withApiErrors } from "../tool-errors"

interface UpdateArgs {
  path: string
  /** 생략하면 저장된 스키마를 재사용한다 */
  schema?: SchemaObject
  count: number
  locale: "ko" | "en"
  fakerHints?: Record<string, string>
  /** 리소스 형태를 변경할 때 지정 (생략 시 기존 설정 유지) */
  resourceType?: MockResourceType
  /** 지정하면 켜고, 생략하면 기존 설정을 유지한다 */
  pagination?: { pageParam: string; limitParam: string }
  sort?: { sortParam: string; orderParam: string }
  search?: { searchParam: string }
  /** true일 때만 끈다 (미지정 = 기존 설정 유지) */
  disablePagination?: boolean
  disableSort?: boolean
  disableSearch?: boolean
}

export async function handleUpdateMockApi(
  client: ApiClient,
  config: McpConfig,
  {
    path,
    schema,
    count,
    locale,
    fakerHints,
    pagination,
    sort,
    search,
    disablePagination,
    disableSort,
    disableSearch,
    resourceType,
  }: UpdateArgs
) {
  // 저장된 fields/options를 재사용해야 하므로 단건 전체를 가져온다
  const item = await findFullItemByPath(client, path)

  if (!item) {
    return toolError(
      `"${path}" 경로의 항목을 찾을 수 없습니다. list_mock_apis로 경로를 확인하세요.`
    )
  }
  if (item.itemType !== "File") {
    return toolError(`"${path}"는 폴더입니다. mock API(File) 경로를 지정하세요.`)
  }

  // schema가 제공되었으면 그것을 사용하고, 미지정 시 item.fields로부터 스키마를 동적으로 역투영한다.
  const storedSchema = item.fields ? fieldsToSchema(item.fields) : undefined
  const sourceSchema = schema ?? storedSchema

  // 빈 객체 truthy 방어 및 최소 1개 필드 검증
  if (!sourceSchema || Object.keys(sourceSchema).length === 0) {
    return toolError(
      `"${path}"에 유효한 스키마 필드가 없습니다. 최소 1개 이상의 필드가 포함된 schema를 지정하세요.`
    )
  }

  // resourceType 인자가 주어지면 변경하고, 생략 시 기존 설정을 유지한다.
  const currentResourceType = item.options?.resourceType ?? "collection"
  const targetResourceType = resourceType ?? currentResourceType
  const isObject = targetResourceType === "object"
  const isModeChanged =
    resourceType !== undefined && resourceType !== currentResourceType

  // 컬렉션 모드에서만 예약 필드 id를 스키마 최상위에 강제 주입한다. 단일 객체 모드는 원본/사용자 스키마를 보존한다.
  const finalSchema = isObject ? sourceSchema : withIdField(sourceSchema)

  // schema 미지정: 기존 item.fields를 재사용하여 Faker 힌트 보존 (단, 모드 변경 시에는 재생성)
  // schema 명시: 새로운 스키마로 전면 교체(초기화)
  const reuseStoredFields =
    !isModeChanged &&
    schema === undefined &&
    (item.fields?.length ?? 0) > 0
  const fields = reuseStoredFields
    ? normalizeFields(item.fields!)
    : schemaToFields(finalSchema)

  if (fakerHints) {
    const { errors } = applyFakerHints(fields, fakerHints)
    if (errors.length > 0) {
      return toolError(`fakerHints 오류:\n- ${errors.join("\n- ")}`)
    }
  }

  const json = isObject
    ? generateSingleObjectData(fields, locale)
    : generateDummyData(fields, count, locale)

  // API는 options를 통째로 대체하므로, 미지정 기능은 기존 값을 그대로 되돌려보내
  // 웹에서 켜 둔 pagination/sort/search가 꺼지지 않게 한다.
  const options = buildMockApiOptions(item.options, {
    resourceType,
    pagination,
    sort,
    search,
    disablePagination,
    disableSort,
    disableSearch,
  })

  // 이름·위치는 그대로 두고 스키마·데이터만 갱신한다 (id는 내부에서만 사용)
  await client.updateItem({
    itemId: item.id,
    name: item.name,
    itemType: "File",
    parentId: item.parentId,
    json,
    options,
    fields,
  })

  const mockUrl = `${getMockApiBaseUrl(config.MOCK_HUB_WORKSPACE_ID, config.MOCK_DOMAIN)}${item.path}`

  if (isObject) {
    const lines = [
      `mock API가 갱신되었습니다: ${item.path} (단일 객체 모드)`,
      `- 단일 객체 URL: ${mockUrl}`,
      `- 단건 조회/수정/삭제: ${mockUrl}`,
      "",
      "샘플 데이터:",
      "```json",
      JSON.stringify(json, null, 2),
      "```",
    ]
    return toolText(lines.join("\n"))
  }

  const lines = [
    `mock API가 갱신되었습니다: ${item.path}`,
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
      `- 정렬: ${mockUrl}?${params.sort.sortParam}=<field>&${params.sort.orderParam}=asc`
    )
  }
  if (params.search) {
    lines.push(`- 전문검색: ${mockUrl}?${params.search.searchParam}=<query>`)
  }

  const sampleList = (json as any[]).slice(0, 2)
  const sampleLabel =
    (json as any[]).length <= 2
      ? `샘플 데이터 (${sampleList.length}건):`
      : `샘플 데이터 (앞 ${sampleList.length}건):`
  lines.push("", sampleLabel, "```json")
  lines.push(JSON.stringify(sampleList, null, 2), "```")
  return toolText(lines.join("\n"))
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
        "경로로 지정한 Mock API의 스키마와 데이터를 갱신합니다. [주의: 기존 런타임 CUD 데이터가 초기화되고 새 mock 데이터로 교체됩니다.] " +
        "필드 구조를 변경하려면 먼저 describe_mock_api로 기존 스키마를 조회한 후 수정된 전체 스키마를 schema 인자로 전달하세요. " +
        "schema를 생략하면 기존 스키마를 유지하며 mock 데이터만 새로 생성(리프레시)합니다. 경로는 list_mock_apis로 확인하세요. " +
        SCHEMA_VALUE_TYPES_HINT,
      annotations: {
        // json을 통째로 교체하고 커밋 후 Redis 오버레이까지 폐기한다.
        // 기존 레코드와 사용자의 런타임 편집이 되돌릴 수 없이 사라진다.
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
      },
      inputSchema: {
        path: z
          .string()
          .describe("갱신할 대상 Mock API의 절대 경로 (예: /shop/users)"),
        schema: schemaObjectInput
          .optional()
          .describe(
            "새로 대체할 전체 스키마 객체. 생략 시 기존 저장된 스키마를 그대로 유지합니다. (최상위 id는 자동 생성되므로 포함하지 마세요)"
          ),
        resourceType: z
          .enum(["collection", "object"])
          .optional()
          .describe(
            "리소스 형태를 변경할 때 지정합니다. 'collection'(기본값, 배열/목록 CRUD) 또는 'object'(단일 객체, 예: /me, /settings). 생략 시 기존 설정을 유지합니다."
          ),
        count: z
          .number()
          .int()
          .min(1)
          .max(50)
          .default(10)
          .describe(
            "생성할 mock 데이터 건수 (1~50, 기본값 10, 단일 객체 모드에서는 무시됨)"
          ),
        locale: z.enum(["ko", "en"]).default("ko"),
        fakerHints: z
          .record(z.string())
          .optional()
          .describe(
            '특정 필드에 적용할 Faker 메서드 매핑 (예: { "author.name": "person.fullName" })'
          ),
        ...mockApiOptionInputShape,
        ...mockApiDisableInputShape,
      },
    },
    async (args) => withApiErrors(() => handleUpdateMockApi(client, config, args))
  )
}
