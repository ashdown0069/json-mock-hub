import { FieldSchema } from "@workspace/types"

/**
 * FieldSchema 트리를 재귀 순회하며 transform 함수를 적용한다.
 * null을 반환하면 해당 노드를 제거한다(removeField 용).
 */
export function mapFieldTree(
  fields: FieldSchema[],
  transform: (field: FieldSchema) => FieldSchema | null
): FieldSchema[] {
  return fields
    .map((field) => {
      const result = transform(field)
      if (result === null) return null
      return {
        ...result,
        fields: result.fields
          ? mapFieldTree(result.fields, transform)
          : undefined,
      } as FieldSchema
    })
    .filter((f): f is FieldSchema => f !== null)
}
