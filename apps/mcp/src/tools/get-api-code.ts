import { z } from "zod"
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import type { PrimitiveSchemaDefinition } from "@modelcontextprotocol/sdk/types.js"
import { schemaToTsInterface } from "@workspace/codegen/schemaToType"
import { buildClientSnippet } from "@workspace/codegen/clientSnippets"
import { buildQuerySnippet } from "@workspace/codegen/querySnippets"
import { buildValidationSnippet } from "@workspace/codegen/validationSnippets"
import type { ApiClient } from "../api-client"
import type { McpConfig } from "../config"
import { findItemByPath } from "../resolve"
import { buildCodeContext } from "../code-context"
import { toolText, toolError, formatApiError, type ToolResult } from "../tool-result"

export type CodeOptions = {
  lang: "ts" | "js"
  clientMode: "axios" | "fetch" | "axios+query" | "fetch+query"
  validation: "zod" | "yup" | "joi" | "none"
}

/** 빠진 옵션을 사용자에게 물어 값을 받아온다. 미지원/취소 시 null. */
export type ElicitFn = (
  missing: (keyof CodeOptions)[]
) => Promise<Partial<CodeOptions> | null>

const OPTION_KEYS: (keyof CodeOptions)[] = ["lang", "clientMode", "validation"]

const LANGS = ["ts", "js"] as const
const CLIENT_MODES = ["axios", "fetch", "axios+query", "fetch+query"] as const
const VALIDATIONS = ["zod", "yup", "joi", "none"] as const

/** elicitation으로 받은 원시 값에서 유효한 enum만 추려낸다(비정상 클라이언트 방어). */
export function sanitizeCodeOptions(
  raw: Record<string, unknown> | null | undefined
): Partial<CodeOptions> {
  const out: Partial<CodeOptions> = {}
  if (!raw) return out
  if (typeof raw.lang === "string" && (LANGS as readonly string[]).includes(raw.lang))
    out.lang = raw.lang as CodeOptions["lang"]
  if (
    typeof raw.clientMode === "string" &&
    (CLIENT_MODES as readonly string[]).includes(raw.clientMode)
  )
    out.clientMode = raw.clientMode as CodeOptions["clientMode"]
  if (
    typeof raw.validation === "string" &&
    (VALIDATIONS as readonly string[]).includes(raw.validation)
  )
    out.validation = raw.validation as CodeOptions["validation"]
  return out
}

export async function handleGetApiCode(
  client: ApiClient,
  config: McpConfig,
  args: { path: string } & Partial<CodeOptions>,
  elicit?: ElicitFn
): Promise<ToolResult> {
  let items
  try {
    items = await client.getItems()
  } catch (error) {
    return formatApiError(error)
  }

  const item = findItemByPath(items, args.path)
  if (!item) {
    return toolError(
      `"${args.path}" 경로의 항목을 찾을 수 없습니다. list_mock_apis로 경로를 확인하세요.`
    )
  }
  if (item.itemType !== "File") {
    return toolError(`"${args.path}"는 폴더입니다. mock API(File) 경로를 지정하세요.`)
  }
  if (!item.schema || Object.keys(item.schema).length === 0) {
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
    const chosen = await elicit(missing)
    if (chosen) Object.assign(opts, chosen)
    missing = OPTION_KEYS.filter((k) => opts[k] === undefined)
  }

  if (missing.length > 0) {
    // 선택 UI 미지원 클라이언트 폴백: AI가 사용자에게 물어 다시 호출하도록 안내
    return toolText(
      [
        "코드 생성 옵션을 사용자에게 확인한 뒤 get_api_code를 해당 인자와 함께 다시 호출하세요.",
        "- lang: ts(interface 포함) | js",
        "- clientMode: axios | fetch | axios+query | fetch+query",
        "- validation: zod | yup | joi | none(생성 안 함)",
      ].join("\n")
    )
  }

  const { lang, clientMode, validation } = opts as CodeOptions
  const ctx = buildCodeContext(item, config)
  const fence = lang === "ts" ? "typescript" : "javascript"
  const httpClient = clientMode.startsWith("axios") ? "axios" : "fetch"
  const includeQuery = clientMode.endsWith("+query")

  const sections: string[] = [
    "아래는 참고용 완제품 코드입니다. 사용자가 요청한 부분만 발췌·각색해서 제시하세요.",
  ]
  // TS 타입 선언은 lang이 ts일 때만 포함
  if (lang === "ts") {
    sections.push("", "## 타입", "```" + fence, schemaToTsInterface(ctx.schema, ctx.typeName), "```")
  }
  sections.push(
    "",
    `## HTTP 클라이언트 (${httpClient})`,
    "```" + fence,
    buildClientSnippet(ctx, httpClient, lang),
    "```"
  )
  if (includeQuery) {
    sections.push("", "## react-query 훅", "```" + fence, buildQuerySnippet(ctx, lang), "```")
  }
  if (validation !== "none") {
    sections.push(
      "",
      `## 검증 스키마 (${validation})`,
      "```" + fence,
      buildValidationSnippet(ctx, validation, lang),
      "```"
    )
  }
  return toolText(sections.join("\n"))
}

export function registerGetApiCode(
  server: McpServer,
  client: ApiClient,
  config: McpConfig
) {
  // 클라이언트가 elicitation을 지원하면 선택 UI를 띄우고, 아니면 null을 돌려 폴백시킨다
  const elicit: ElicitFn = async (missing) => {
    const caps = server.server.getClientCapabilities()
    if (!caps?.elicitation) return null

    // elicitInput의 requestedSchema.properties가 요구하는 SDK 타입에 맞춘다 (동작은 동일)
    const props: Record<string, PrimitiveSchemaDefinition> = {}
    if (missing.includes("lang")) {
      props.lang = {
        type: "string", title: "언어", enum: ["ts", "js"],
        enumNames: ["TypeScript (interface 포함)", "JavaScript"],
      }
    }
    if (missing.includes("clientMode")) {
      props.clientMode = {
        type: "string", title: "HTTP 클라이언트",
        enum: ["axios", "fetch", "axios+query", "fetch+query"],
        enumNames: ["axios", "fetch", "axios + TanStack Query", "fetch + TanStack Query"],
      }
    }
    if (missing.includes("validation")) {
      props.validation = {
        type: "string", title: "검증 라이브러리",
        enum: ["zod", "yup", "joi", "none"],
        enumNames: ["zod", "yup", "joi", "생성 안 함"],
      }
    }

    const result = await server.server.elicitInput({
      message: "코드 생성 옵션을 선택하세요.",
      requestedSchema: { type: "object", properties: props, required: missing },
    })
    if (result.action !== "accept" || !result.content) return null
    return sanitizeCodeOptions(result.content as Record<string, unknown>)
  }

  server.registerTool(
    "get_api_code",
    {
      title: "Mock API 연동 코드 참고",
      description:
        "저장된 mock API의 스키마로부터 TS 타입·HTTP 클라이언트·react-query 훅·검증 스키마 완제품 코드를 생성해 반환합니다. " +
        "반환된 코드는 '참고용 완제품'이므로 사용자가 요청한 부분만 발췌·각색해서 제시하세요. " +
        "lang/clientMode/validation을 사용자가 이미 말했으면 인자로 넘기고, 정하지 않았으면 생략하세요(생략하면 사용자에게 선택 UI를 띄우거나, 미지원 클라이언트면 확인을 요청합니다).",
      inputSchema: {
        path: z
          .string()
          .describe("코드를 생성할 mock API 경로 (list_mock_apis로 확인, 예: /shop/users)"),
        lang: z.enum(["ts", "js"]).optional().describe("ts는 interface 타입까지 포함"),
        clientMode: z
          .enum(["axios", "fetch", "axios+query", "fetch+query"])
          .optional()
          .describe("HTTP 클라이언트 (+query는 TanStack Query 훅 포함)"),
        validation: z
          .enum(["zod", "yup", "joi", "none"])
          .optional()
          .describe("검증 라이브러리 (none은 생성 안 함)"),
      },
    },
    async (args) => handleGetApiCode(client, config, args, elicit)
  )
}
