import { z } from "zod"
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import type { ApiClient } from "../api-client"
import type { McpConfig } from "../config"
import { findFullItemByPath } from "../resolve"
import { buildCodeGenContext } from "@workspace/codegen/context"
import { getMockApiBaseUrl } from "../mock-url"
import { toolText, toolError, type ToolResult } from "../tool-result"
import { buildCodeSections } from "./code-sections"
import { withApiErrors } from "../tool-errors"
import {
  CODE_OPTION_SPEC,
  codeOptionZodShape,
  codeOptionFallbackText,
  elicitCodeOptions,
  type CodeOptions,
  type CodeOptionKey,
} from "./code-options"

/** 빠진 옵션을 사용자에게 물어 값을 받아온다. 미지원/취소 시 null. */
type ElicitFn = (
  missing: CodeOptionKey[]
) => Promise<Partial<CodeOptions> | null>

const OPTION_KEYS: CodeOptionKey[] = Object.keys(CODE_OPTION_SPEC) as CodeOptionKey[]

export async function handleGetApiCode(
  client: ApiClient,
  config: McpConfig,
  args: { path: string } & Partial<CodeOptions>,
  elicit?: ElicitFn
): Promise<ToolResult> {
  // 코드 생성에는 저장된 fields가 필요하므로 단건 전체를 가져온다
  const item = await findFullItemByPath(client, args.path)

  if (!item) {
    return toolError(
      `"${args.path}" 경로의 항목을 찾을 수 없습니다. list_mock_apis로 경로를 확인하세요.`
    )
  }
  if (item.itemType !== "File") {
    return toolError(`"${args.path}"는 폴더입니다. mock API(File) 경로를 지정하세요.`)
  }
  if (!item.fields || item.fields.length === 0) {
    return toolError(`"${args.path}"에 스키마 정보가 없어 코드를 생성할 수 없습니다.`)
  }

  // 사용자가 인자로 넘긴 옵션은 유지하고, 빠진 것만 모은다
  const opts: Partial<CodeOptions> = {
    lang: args.lang,
    clientMode: args.clientMode,
    validation: args.validation,
  }
  let missing = OPTION_KEYS.filter((k) => opts[k] === undefined)

  if (missing.length > 0 && elicit) {
    // elicitInput은 SDK 기본 60초 타임아웃과 클라이언트 거부로 reject될 수 있다.
    // 예외를 전파시키면 아래 안내 폴백에 도달하지 못한다.
    const chosen = await elicit(missing).catch((error) => {
      console.error(
        "[json-mock-hub-mcp] elicitInput 실패 — 안내 폴백으로 전환합니다:",
        error instanceof Error ? error.message : String(error)
      )
      return null
    })
    if (chosen) Object.assign(opts, chosen)
    missing = OPTION_KEYS.filter((k) => opts[k] === undefined)
  }

  if (missing.length > 0) {
    // 선택 UI 미지원 클라이언트 폴백: AI가 사용자에게 물어 다시 호출하도록 안내
    return toolText(
      "코드 생성 옵션을 사용자에게 확인한 뒤 get_api_code를 해당 인자와 함께 다시 호출하세요.\n" +
        codeOptionFallbackText()
    )
  }

  const ctx = buildCodeGenContext(item, {
    baseUrl: getMockApiBaseUrl(item.workspace, config.MOCK_DOMAIN),
  })
  const text = buildCodeSections(ctx, opts as CodeOptions)
  return toolText(text)
}

export function registerGetApiCode(
  server: McpServer,
  client: ApiClient,
  config: McpConfig
) {
  const zodShape = codeOptionZodShape()

  server.registerTool(
    "get_api_code",
    {
      title: "Mock API 연동 코드 생성",
      description:
        "지정된 Mock API의 스키마와 설정을 기반으로 프론트엔드 연동 완제품 코드(TypeScript 타입 정의, Fetch/Axios API 클라이언트 함수, TanStack Query 훅, Zod/Yup/Joi 유효성 검증 스키마)를 자동 생성합니다. " +
        "클라이언트 연동 코드를 작성할 때 이 도구로 기준 코드를 조회한 후 필요한 부분을 조합해 사용하세요. " +
        "lang/clientMode/validation 옵션을 생략하면 사용자에게 대화형 선택창(Elicitation)을 띄웁니다.",
      annotations: { readOnlyHint: true, destructiveHint: false },
      inputSchema: {
        path: z
          .string()
          .describe(
            "연동 코드를 추출할 Mock API 경로 (list_mock_apis로 확인, 예: /shop/users)"
          ),
        lang: zodShape.lang.describe(
          "사용 언어 (ts: TypeScript 인터페이스/타입 포함, js: JavaScript)"
        ),
        clientMode: zodShape.clientMode.describe(
          "HTTP 클라이언트 및 쿼리 훅 (fetch, fetch+query, axios, axios+query)"
        ),
        validation: zodShape.validation.describe(
          "런타임 유효성 검증 라이브러리 (zod, yup, joi, none: 미생성)"
        ),
      },
    },
    async (args) =>
      withApiErrors(() =>
        handleGetApiCode(client, config, args, (missing) =>
          elicitCodeOptions(server, missing)
        )
      )
  )
}
