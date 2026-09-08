import {
  SchemaPrimitive,
  SchemaArrayType,
  SchemaObject,
  SchemaType,
  MAX_SCHEMA_DEPTH,
} from "@workspace/types"
import { formatObjectKey } from "./identifiers"

export { MAX_SCHEMA_DEPTH }

// convertSchema.ts(fieldsToSchema)가 생성하는 배열 표현 { type: "array", items } 판별 가드
export function isSchemaArray(value: SchemaType): value is SchemaArrayType {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as SchemaArrayType).type === "array" &&
    "items" in value
  )
}

// date/uuid는 JSON에 문자열로 저장되므로 TS 타입은 string으로 매핑합니다.
const PRIMITIVE_TS_MAP = {
  string: "string",
  number: "number",
  boolean: "boolean",
  date: "string",
  uuid: "string",
} satisfies Record<SchemaPrimitive, string>

function schemaTypeToTs(value: SchemaType, indent: number): string {
  if (indent > MAX_SCHEMA_DEPTH) return "unknown"

  if (typeof value === "string") {
    // 미지 타입을 string으로 폴백하면 잘못된 타입이 조용히 통과한다
    return (PRIMITIVE_TS_MAP as Record<string, string>)[value] ?? "unknown"
  }
  if (isSchemaArray(value)) {
    return `${schemaTypeToTs(value.items, indent)}[]`
  }
  // 스키마 객체 탐색 중 런타임에 null/원시값 등 비객체 타입이 유입될 경우
  // Object.entries(null) 예외 크래시를 방지하고 안전하게 unknown으로 처리한다.
  if (typeof value !== "object" || value === null) {
    return "unknown"
  }
  return objectToTs(value, indent)
}

function objectToTs(schema: SchemaObject, indent: number): string {
  const entries = Object.entries(schema)
  if (entries.length === 0) return "{}"
  const pad = "  ".repeat(indent + 1)
  const closePad = "  ".repeat(indent)
  const lines = entries.map(
    ([key, value]) =>
      `${pad}${formatObjectKey(key)}: ${schemaTypeToTs(value, indent + 1)};`
  )
  return `{\n${lines.join("\n")}\n${closePad}}`
}

/** 파생된 SchemaObject를 TS interface 선언 문자열로 변환합니다. */
export function schemaToTsInterface(
  schema: SchemaObject,
  typeName: string
): string {
  return `export interface ${typeName} ${objectToTs(schema, 0)}`
}
