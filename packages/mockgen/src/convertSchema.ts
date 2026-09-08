import {
  FieldSchema,
  FieldType,
  SchemaPrimitive,
  MAX_SCHEMA_DEPTH,
  isSchemaPrimitive,
} from "@workspace/types"
import { nanoid } from "nanoid"

/**
 * 지원 목록에 없는 원시 타입을 읽었을 때의 대체값.
 *
 * string을 고른 이유: 제거된 objectId의 검증 코드가 이미 z.string()이었으므로
 * 검증 계층 기준으로 동작이 보존된다. 교정하지 않고 원본을 통과시키면 생성기가
 * 값을 만들지 못해 목데이터 필드가 null이 되고, 재저장 시 무효 타입이 그대로
 * 다시 기록돼 자가치유되지 않는다.
 */
const FALLBACK_PRIMITIVE: SchemaPrimitive = "string"

/** object/array는 원시 타입이 아니지만 유효한 FieldType이므로 교정 대상이 아니다. */
function normalizeFieldType(type: unknown): FieldType {
  if (type === "object" || type === "array") return type
  return isSchemaPrimitive(type) ? type : FALLBACK_PRIMITIVE
}

/**
 * 저장된 fields를 현재 타입 목록에 맞게 교정한다.
 *
 * 교정은 타입에만 적용하고 나머지 속성(fakerMethod 등)은 보존한다.
 */
export function normalizeFields(
  fields: unknown,
  depth = 0
): FieldSchema[] {
  // 깊이 상한은 fieldsToSchema와 같다. 정상 저장 데이터는 이미 그 상한을 넘지
  // 않으므로, 여기서 잘리는 것은 손으로 만든 과도한 중첩뿐이다.
  if (!Array.isArray(fields) || depth >= MAX_SCHEMA_DEPTH) return []

  return fields
    .filter(
      (field): field is Record<string, unknown> =>
        typeof field === "object" && field !== null && !Array.isArray(field)
    )
    .map(
      (field) =>
        ({
          ...field,
          type: normalizeFieldType(field.type),
          ...(field.fields !== undefined && {
            fields: normalizeFields(field.fields, depth + 1),
          }),
          ...(field.arrayItemType !== undefined && {
            arrayItemType: isSchemaPrimitive(field.arrayItemType)
              ? field.arrayItemType
              : FALLBACK_PRIMITIVE,
          }),
        }) as FieldSchema
    )
}

/**
 * FieldSchema[] (UI 필드 정의) → Record<string, unknown> (JSON Schema 파생 객체)
 */
export function fieldsToSchema(
  fields: FieldSchema[],
  depth = 0
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  if (depth >= MAX_SCHEMA_DEPTH) return result

  for (const field of fields) {
    // 이름 앞뒤 공백은 스키마 키에 남으면 목서버 응답에 그대로 노출된다.
    // 중복 이름은 상위 계층(@workspace/types의 findDuplicateFieldIds)이 제출 전에
    // 막으므로 여기서는 예외를 던지지 않는다 — 순수 변환 함수에 검증을 섞지 않는다.
    const name = field.name.trim()
    if (!name) continue

    switch (field.type) {
      case "object":
        result[name] = field.fields
          ? fieldsToSchema(field.fields, depth + 1)
          : {}
        break
      case "array":
        result[name] = {
          type: "array",
          items:
            field.fields && field.fields.length > 0
              ? fieldsToSchema(field.fields, depth + 1)
              : (field.arrayItemType ?? "string"),
        }
        break
      default:
        result[name] = field.type
    }
  }

  return result
}

/**
 * 외부 JSON Schema 객체(예: MCP 도구 입력) → FieldSchema[] (목데이터 필드 명세)
 * UI 폼이나 MCP에서 수신한 스키마 정의를 정규화된 fields 배열로 변환하는 순수 파서입니다.
 */
export function schemaToFields(
  schema: Record<string, unknown> | null | undefined,
  depth = 0
): FieldSchema[] {
  if (!schema || depth >= MAX_SCHEMA_DEPTH) return []
  return Object.entries(schema).map(([name, value]) => {
    if (typeof value === "string") {
      return {
        id: nanoid(),
        name,
        // 캐스팅으로 통과시키면 무효 타입이 그대로 UI·생성기까지 내려간다
        type: isSchemaPrimitive(value) ? value : FALLBACK_PRIMITIVE,
        fakerMethod: "none",
      }
    }
    const v = value as Record<string, unknown>
    if (v && v.type === "array" && "items" in v) {
      const items = v.items
      const isObjectItems = typeof items === "object" && items !== null
      return {
        id: nanoid(),
        name,
        type: "array" as FieldType,
        fakerMethod: "none",
        fields: isObjectItems
          ? schemaToFields(items as Record<string, unknown>, depth + 1)
          : undefined,
        // 스칼라 배열이면 원소 타입 문자열을 보존한다 (원소도 같은 규칙으로 교정한다)
        ...(typeof items === "string" && {
          arrayItemType: isSchemaPrimitive(items) ? items : FALLBACK_PRIMITIVE,
        }),
      }
    }
    return {
      id: nanoid(),
      name,
      type: "object" as FieldType,
      fakerMethod: "none",
      fields: schemaToFields(v, depth + 1),
    }
  })
}

/**
 * 스키마 최상위에 예약 필드 id("number", 자동 증가)를 첫 키로 강제 주입한다.
 * 기존 id 정의는 예약 필드 규칙에 따라 덮어쓴다.
 */
export function withIdField(
  schema: Record<string, unknown>
): Record<string, unknown> {
  const { id: _ignored, ...rest } = schema
  return { id: "number", ...rest }
}
