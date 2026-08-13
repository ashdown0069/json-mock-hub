import { z } from "zod"
import type { PrimitiveSchemaDefinition } from "@modelcontextprotocol/sdk/types.js"

/**
 * 코드 생성 옵션의 단일 원천.
 *
 * 이전에는 값 목록이 상수·elicit enum·zod enum·폴백 안내 문자열 4곳에
 * 따로 있었다. clientMode에 하나를 더하려면 4곳을 동시에 고쳐야 하고,
 * 하나만 빠지면 elicitation은 뜨는데 zod가 거부하는 식으로 깨진다.
 *
 * values는 [값, 사람이 읽는 라벨] 쌍이다. **첫 번째 원소가 기본값**이다.
 */
export const CODE_OPTION_SPEC = {
  lang: {
    title: "언어",
    values: [
      ["ts", "TypeScript"],
      ["js", "JavaScript"],
    ],
  },
  clientMode: {
    title: "HTTP 클라이언트",
    values: [
      ["axios", "axios"],
      ["axios+query", "axios + TanStack Query"],
      ["fetch", "fetch"],
      ["fetch+query", "fetch + TanStack Query"],
    ],
  },
  validation: {
    title: "검증 라이브러리",
    values: [
      ["zod", "zod"],
      ["yup", "yup"],
      ["joi", "joi"],
      ["none", "생성 안 함"],
    ],
  },
} as const

export type CodeOptionKey = keyof typeof CODE_OPTION_SPEC
export type CodeOptions = {
  [K in CodeOptionKey]: (typeof CODE_OPTION_SPEC)[K]["values"][number][0]
}

const allowedValues = (key: CodeOptionKey): readonly string[] =>
  CODE_OPTION_SPEC[key].values.map(([value]) => value)

/** elicitation으로 받은 원시 값에서 유효한 enum만 추려낸다(비정상 클라이언트 방어). */
export function sanitizeCodeOptions(
  raw: Record<string, unknown> | null | undefined
): Partial<CodeOptions> {
  const out: Partial<CodeOptions> = {}
  if (!raw) return out
  for (const key of Object.keys(CODE_OPTION_SPEC) as CodeOptionKey[]) {
    const candidate = raw[key]
    if (
      typeof candidate === "string" &&
      (allowedValues(key) as readonly string[]).includes(candidate)
    ) {
      (out as Record<string, unknown>)[key] = candidate
    }
  }
  return out
}

/** zod 입력 스키마의 shape. spec에서 파생되므로 값 목록이 어긋날 수 없다. */
export function codeOptionZodShape(): Record<CodeOptionKey, z.ZodTypeAny> {
  const shape = {} as Record<CodeOptionKey, z.ZodTypeAny>
  for (const key of Object.keys(CODE_OPTION_SPEC) as CodeOptionKey[]) {
    const values = allowedValues(key) as [string, ...string[]]
    shape[key] = z.enum(values).optional()
  }
  return shape
}

/** MCP elicitation 요청의 properties. enum과 enumNames가 항상 같은 길이다. */
export function codeOptionElicitProperties(): Record<
  string,
  PrimitiveSchemaDefinition
> {
  const properties: Record<string, PrimitiveSchemaDefinition> = {}
  for (const key of Object.keys(CODE_OPTION_SPEC) as CodeOptionKey[]) {
    const spec = CODE_OPTION_SPEC[key]
    properties[key] = {
      type: "string",
      title: spec.title,
      enum: spec.values.map(([value]) => value),
      enumNames: spec.values.map(([, label]) => label),
    } as PrimitiveSchemaDefinition
  }
  return properties
}

/** elicitation을 지원하지 않는 클라이언트에 보여줄 안내 문자열. */
export function codeOptionFallbackText(): string {
  const lines = (Object.keys(CODE_OPTION_SPEC) as CodeOptionKey[]).map((key) => {
    const spec = CODE_OPTION_SPEC[key]
    const values = spec.values.map(([value]) => value).join(" | ")
    return `- ${key}(${spec.title}): ${values} (기본값 ${allowedValues(key)[0]})`
  })
  return lines.join("\n")
}
