import { z } from "zod"
import type { FieldSchema, SchemaObject, SchemaType } from "@workspace/types"
import { FAKER_BY_TYPE } from "@workspace/mockgen/fakerMethods"

const primitiveInput = z.enum([
  "string",
  "number",
  "boolean",
  "date",
  "uuid",
  "objectId",
])

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

// 타입별 유효 faker 메서드를 "module.method" 문자열 배열로 평탄화 (generateData의 해석 포맷과 동일)
function validMethodsForType(type: string): string[] {
  const catalog = FAKER_BY_TYPE[type]
  if (!catalog) return []
  return Object.entries(catalog).flatMap(([module, methods]) =>
    methods.map((method) => `${module}.${method}`)
  )
}

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

    const valid = validMethodsForType(target.type)
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
