import { FieldSchema, FieldType, SchemaPrimitive } from "@workspace/types"

/**
 * FieldSchema[] (UI 폼 데이터) → Record<string, unknown> (FileItem.schema)
 */
export function fieldsToSchema(fields: FieldSchema[]): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const field of fields) {
    if (!field.name) continue

    switch (field.type) {
      case "object":
        result[field.name] = field.fields
          ? fieldsToSchema(field.fields)
          : {}
        break
      case "array":
        result[field.name] = {
          type: "array",
          items: field.fields
            ? fieldsToSchema(field.fields)
            : (field.arrayItemType ?? "string"),
        }
        break
      default:
        result[field.name] = field.type
    }
  }

  return result
}

const newFieldId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/** Record<string, unknown> (FileItem.schema) → FieldSchema[] — fieldsToSchema의 역함수 */
export function schemaToFields(
  schema: Record<string, unknown> | null | undefined
): FieldSchema[] {
  if (!schema) return []
  return Object.entries(schema).map(([name, value]) => {
    if (typeof value === "string") {
      return { id: newFieldId(), name, type: value as FieldType, fakerMethod: "none" }
    }
    const v = value as Record<string, unknown>
    if (v && v.type === "array" && "items" in v) {
      const items = v.items
      const isObjectItems = typeof items === "object" && items !== null
      return {
        id: newFieldId(),
        name,
        type: "array" as FieldType,
        fakerMethod: "none",
        fields: isObjectItems
          ? schemaToFields(items as Record<string, unknown>)
          : undefined,
        // 스칼라 배열이면 원소 타입 문자열을 보존한다
        ...(typeof items === "string" && {
          arrayItemType: items as SchemaPrimitive,
        }),
      }
    }
    return {
      id: newFieldId(),
      name,
      type: "object" as FieldType,
      fakerMethod: "none",
      fields: schemaToFields(v),
    }
  })
}
