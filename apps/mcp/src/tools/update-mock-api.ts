import { z } from "zod"
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import {
  normalizeFieldDefs,
  schemaToFields,
  withIdField,
} from "@workspace/mockgen/convertSchema"
import { generateDummyData } from "@workspace/mockgen/generateData"
import type { SchemaObject } from "@workspace/types"
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
  }: UpdateArgs
) {
  // 저장된 schema/options를 재사용해야 하므로 단건 전체를 가져온다
  const item = await findFullItemByPath(client, path)

  if (!item) {
    return toolError(
      `"${path}" 경로의 항목을 찾을 수 없습니다. list_mock_apis로 경로를 확인하세요.`
    )
  }
  if (item.itemType !== "File") {
    return toolError(`"${path}"는 폴더입니다. mock API(File) 경로를 지정하세요.`)
  }

  // 스키마 미지정 = 저장된 스키마 재사용. LLM이 추측하다 필드를 잃는 것을 막는다.
  const sourceSchema = schema ?? item.schema
  if (!sourceSchema) {
    return toolError(
      `"${path}"에 저장된 스키마가 없습니다. schema 인자를 지정해서 다시 호출하세요.`
    )
  }

  // 예약 필드 id를 스키마 최상위에 강제 주입한다 (웹 생성 흐름과 동일 계약)
  const schemaWithId = withIdField(sourceSchema)

  // schemaToFields는 모든 필드에 fakerMethod: "none"을 넣는다(convertSchema.ts:60,70,84).
  // 스키마를 재사용하는 경로에서 그대로 쓰면 사용자가 웹에서 지정한 faker 설정이
  // 저장까지 덮어써져 사라진다(웹의 hydrateFromItem이 fieldDefs를 진실 원천으로 쓴다).
  // 스키마를 명시적으로 대체한 경우에만 재생성한다.
  const reuseStoredFieldDefs =
    schema === undefined && (item.fieldDefs?.length ?? 0) > 0
  const fieldDefs = reuseStoredFieldDefs
    ? // 저장된 fieldDefs는 무검증이라 지원하지 않는 타입이 섞여 있을 수 있다.
      // 그대로 generateDummyData에 넘기면 그 필드가 조용히 null이 된다.
      // normalizeFieldDefs는 노드를 새로 만들어 돌려주므로, 아래 applyFakerHints가
      // in-place로 수정해도 저장된 원본이 오염되지 않는다(별도 복제 불필요).
      normalizeFieldDefs(item.fieldDefs)
    : schemaToFields(schemaWithId)

  if (fakerHints) {
    const { errors } = applyFakerHints(fieldDefs, fakerHints)
    if (errors.length > 0) {
      return toolError(`fakerHints 오류:\n- ${errors.join("\n- ")}`)
    }
  }

  const json = generateDummyData(fieldDefs, count, locale)

  // API는 options를 통째로 대체하므로, 미지정 기능은 기존 값을 그대로 되돌려보내
  // 웹에서 켜 둔 pagination/sort/search가 꺼지지 않게 한다.
  const options = buildMockApiOptions(item.options, {
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
    schema: schemaWithId as SchemaObject,
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
        count: z
          .number()
          .int()
          .min(1)
          .max(50)
          .default(10)
          .describe("생성할 mock 데이터 건수 (1~50, 기본값 10)"),
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
