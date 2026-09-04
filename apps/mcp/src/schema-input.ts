import { z } from "zod"
import {
  SCHEMA_PRIMITIVES,
  type FieldSchema,
  type SchemaObject,
  type SchemaType,
} from "@workspace/types"
import { fakerMethodsForType } from "@workspace/mockgen/fakerMethods"

// 목록을 여기 다시 적으면 @workspace/types와 조용히 어긋난다. 이 enum은
// satisfies로 강제되지 않아 컴파일러가 잡아주지 못하기 때문이다 —
// objectId 제거 때 실제로 이 지점만 뒤처져 손으로 찾아 고쳐야 했다.
const primitiveInput = z.enum(SCHEMA_PRIMITIVES)

/**
 * 도구 설명에 넣는 스키마 값 타입 안내.
 *
 * primitiveInput과 같은 목록에서 파생시킨다 — 문구가 실제 허용 타입과 어긋나면
 * LLM이 거부당할 값을 계속 제안한다. create/update 두 도구가 같은 문구를 쓰므로
 * 허용 목록을 소유한 이 모듈 한 곳에 둔다.
 *
 * 앞뒤 공백을 넣지 않는 것이 중요하다 — 호출부가 인접 문자열로 공백을 제공하므로,
 * 여기에 공백을 더하면 최종 설명에 두 칸이 생긴다.
 */
export const SCHEMA_VALUE_TYPES_HINT =
  `지원하는 스키마 타입: ${SCHEMA_PRIMITIVES.map((t) => `"${t}"`).join(" | ")}` +
  ' | { "type": "array", "items": <타입> } | 중첩 객체'

// SchemaObject 재귀 입력: 값 = 기본타입 | { type: "array", items } | 중첩 객체
export const schemaTypeInput: z.ZodType<SchemaType> = z.lazy(() =>
  z.union([
    primitiveInput,
    z.object({ type: z.literal("array"), items: schemaTypeInput }).strict(),
    z.record(schemaTypeInput),
  ])
) as z.ZodType<SchemaType>

export const schemaObjectInput = z.record(
  schemaTypeInput
) as z.ZodType<SchemaObject>

/**
 * dot-path 힌트(예: { "author.name": "person.fullName" })를 fieldDefs에 적용합니다.
 * 존재하지 않는 경로나 타입에 맞지 않는 메서드는 오류 메시지로 수집해 반환합니다 (fields는 in-place 수정).
 */
export function applyFakerHints(
  fields: FieldSchema[],
  hints: Record<string, string>
): { errors: string[] } {
  const errors: string[] = []

  for (const [path, method] of Object.entries(hints)) {
    const segments = path.split(".")
    let current: FieldSchema[] | undefined = fields
    let target: FieldSchema | undefined

    for (const segment of segments) {
      target = current?.find((field) => field.name === segment)
      if (!target) break
      current = target.fields
    }

    if (!target) {
      errors.push(`필드 경로 "${path}"를 스키마에서 찾을 수 없습니다.`)
      continue
    }

    const valid = fakerMethodsForType(target.type)
    if (!valid.includes(method)) {
      const preview = valid.slice(0, 20).join(", ")
      errors.push(
        `"${path}"(${target.type}) 필드에 "${method}"를 쓸 수 없습니다. 사용 가능: ${preview}${valid.length > 20 ? " ..." : ""}`
      )
      continue
    }

    target.fakerMethod = method
  }

  return { errors }
}
