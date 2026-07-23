import { fakerKO, fakerEN } from "@faker-js/faker"
import { FieldSchema } from "@workspace/types"

export const generateDummyData = (
  fields: FieldSchema[],
  count: number,
  locale: string
) => {
  const faker = locale === "ko" ? fakerKO : fakerEN

  // 타입별 원시값 생성을 한 곳으로 모아 스칼라 필드와 스칼라 배열 원소가 동일 규칙을 쓰게 한다 (DRY)
  const generatePrimitive = (type: string): unknown => {
    switch (type) {
      case "string":
        return faker.lorem.word()
      case "number":
        return faker.number.int({ min: 1, max: 1000 })
      case "boolean":
        return faker.datatype.boolean()
      case "date":
        return faker.date.recent().toISOString()
      case "uuid":
        return faker.string.uuid()
      case "objectId":
        return faker.database.mongodbObjectId()
      default:
        return ""
    }
  }

  const generateObject = (schemaFields: FieldSchema[]) => {
    const obj: any = {}
    for (const field of schemaFields) {
      if (!field.name) continue

      if (field.fakerMethod && field.fakerMethod !== "none") {
        const [module, method] = field.fakerMethod.split(".")
        obj[field.name] =
          (faker as any)[module as any]?.[method as any]?.() ?? ""
        continue
      }

      if (field.type === "object") {
        obj[field.name] = field.fields ? generateObject(field.fields) : {}
      } else if (field.type === "array") {
        obj[field.name] = Array.from({ length: 3 }).map(() =>
          field.fields
            ? generateObject(field.fields)
            : generatePrimitive(field.arrayItemType ?? "string")
        )
      } else {
        obj[field.name] = generatePrimitive(field.type)
      }
    }
    return obj
  }

  return Array.from({ length: count }).map(() => generateObject(fields))
}
