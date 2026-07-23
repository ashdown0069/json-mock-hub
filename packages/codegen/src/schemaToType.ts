import { SchemaArrayType, SchemaObject, SchemaType } from "@workspace/types"
import { formatObjectKey } from "./identifiers"

// convertSchema.ts(fieldsToSchema)가 저장하는 배열 표현 { type: "array", items } 판별 가드
export function isSchemaArray(value: SchemaType): value is SchemaArrayType {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as SchemaArrayType).type === "array" &&
    "items" in value
  )
}

// date/uuid는 JSON에 문자열로 저장되므로 TS 타입은 string으로 매핑합니다.
const PRIMITIVE_TS_MAP: Record<string, string> = {
  string: "string",
  number: "number",
  boolean: "boolean",
  date: "string",
  uuid: "string",
  objectId: "string",
}

function schemaTypeToTs(value: SchemaType, indent: number): string {
  if (typeof value === "string") {
    return PRIMITIVE_TS_MAP[value] ?? "string"
  }
  if (isSchemaArray(value)) {
    return `${schemaTypeToTs(value.items, indent)}[]`
  }
  return objectToTs(value as SchemaObject, indent)
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

/** 저장된 SchemaObject를 TS interface 선언 문자열로 변환합니다. */
export function schemaToTsInterface(
  schema: SchemaObject,
  typeName: string
): string {
  return `export interface ${typeName} ${objectToTs(schema, 0)}`
}
