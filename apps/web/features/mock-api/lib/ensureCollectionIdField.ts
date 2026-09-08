import type { FieldSchema } from "@workspace/types"

export const SYSTEM_ID_FIELD: FieldSchema = {
  id: "system-id",
  name: "id",
  type: "number",
  fakerMethod: "none",
}

/**
 * 컬렉션 모드에서 저장되는 fields 배열의 최상위에 시스템 예약 필드 id("number")를 보장한다.
 */
export function ensureCollectionIdField(fields: FieldSchema[]): FieldSchema[] {
  const withoutId = fields.filter((f) => f.name.trim().toLowerCase() !== "id")
  return [SYSTEM_ID_FIELD, ...withoutId]
}
