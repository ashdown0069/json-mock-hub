import { fieldsToSchema, schemaToFields } from "../convertSchema"

describe("convertSchema - schemaToFields & fieldsToSchema", () => {
  it("schema가 null/undefined일 경우 빈 배열을 반환한다", () => {
    expect(schemaToFields(null)).toEqual([])
    expect(schemaToFields(undefined)).toEqual([])
  })

  it("primitive 타입의 스키마를 올바르게 변환한다", () => {
    const schema = {
      title: "string",
      views: "number",
      isActive: "boolean",
    }

    const fields = schemaToFields(schema)
    expect(fields).toHaveLength(3)

    expect(fields[0]).toMatchObject({
      name: "title",
      type: "string",
      fakerMethod: "none",
    })
    expect(fields[0]!.id).toBeDefined()

    expect(fields[1]).toMatchObject({
      name: "views",
      type: "number",
      fakerMethod: "none",
    })

    expect(fields[2]).toMatchObject({
      name: "isActive",
      type: "boolean",
      fakerMethod: "none",
    })
  })

  it("중첩 객체(object) 타입의 스키마를 올바르게 변환한다", () => {
    const schema = {
      author: {
        name: "string",
        age: "number",
      },
    }

    const fields = schemaToFields(schema)
    expect(fields).toHaveLength(1)
    expect(fields[0]!.name).toBe("author")
    expect(fields[0]!.type).toBe("object")
    expect(fields[0]!.fields).toHaveLength(2)

    expect(fields[0]!.fields?.[0]).toMatchObject({
      name: "name",
      type: "string",
    })
    expect(fields[0]!.fields?.[1]).toMatchObject({
      name: "age",
      type: "number",
    })
  })

  it("객체 배열(array of objects) 타입의 스키마를 올바르게 변환한다", () => {
    const schema = {
      comments: {
        type: "array",
        items: {
          id: "string",
          content: "string",
        },
      },
    }

    const fields = schemaToFields(schema)
    expect(fields).toHaveLength(1)
    expect(fields[0]!.name).toBe("comments")
    expect(fields[0]!.type).toBe("array")
    expect(fields[0]!.fields).toHaveLength(2)

    expect(fields[0]!.fields?.[0]).toMatchObject({
      name: "id",
      type: "string",
    })
  })

  it("기본타입 배열(array of primitives) 타입의 스키마를 올바르게 변환한다 (fields undefined)", () => {
    const schema = {
      tags: {
        type: "array",
        items: "string",
      },
    }

    const fields = schemaToFields(schema)
    expect(fields).toHaveLength(1)
    expect(fields[0]!.name).toBe("tags")
    expect(fields[0]!.type).toBe("array")
    expect(fields[0]!.fields).toBeUndefined()
  })

  it("라운드트립 검증: fieldsToSchema(schemaToFields(s)) === s", () => {
    const originalSchema = {
      title: "string",
      author: {
        name: "string",
        age: "number",
      },
      tags: {
        type: "array",
        items: "string",
      },
      comments: {
        type: "array",
        items: {
          id: "string",
          content: "string",
        },
      },
    }

    const fields = schemaToFields(originalSchema)
    const regeneratedSchema = fieldsToSchema(fields)

    expect(regeneratedSchema).toEqual(originalSchema)
  })

  it("기본타입 배열(number)의 원소 타입을 arrayItemType으로 보존한다", () => {
    const schema = {
      scores: { type: "array", items: "number" },
    }

    const fields = schemaToFields(schema)
    expect(fields[0]).toMatchObject({
      name: "scores",
      type: "array",
      arrayItemType: "number",
    })
    expect(fields[0]!.fields).toBeUndefined()
  })

  it("라운드트립: number 배열도 원래 스키마로 복원된다", () => {
    const original = {
      scores: { type: "array", items: "number" },
    }
    expect(fieldsToSchema(schemaToFields(original))).toEqual(original)
  })
})
