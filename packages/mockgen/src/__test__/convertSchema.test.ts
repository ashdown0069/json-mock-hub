import {
  fieldsToSchema,
  normalizeFieldDefs,
  schemaToFields,
  withIdField,
} from "../convertSchema"


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

describe("withIdField", () => {
  it("스키마 최상위 첫 키로 id: number를 주입한다", () => {
    const result = withIdField({ title: "string" })
    expect(result).toEqual({ id: "number", title: "string" })
    expect(Object.keys(result)[0]).toBe("id")
  })

  it("기존 id 정의는 예약 필드 규칙으로 덮어쓴다", () => {
    const result = withIdField({ id: "uuid", title: "string" })
    expect(result.id).toBe("number")
  })

  it("빈 스키마에도 id만 있는 스키마를 반환한다", () => {
    expect(withIdField({})).toEqual({ id: "number" })
  })
})

describe("schemaToFields — 재귀 깊이 상한", () => {
  const deepSchema = (depth: number): Record<string, unknown> => {
    let node: Record<string, unknown> = { leaf: "string" }
    for (let i = 0; i < depth; i += 1) {
      node = { nested: node }
    }
    return node
  }

  it("깊이 5,000에서도 스택 오버플로 없이 반환한다", () => {
    expect(() => schemaToFields(deepSchema(5000))).not.toThrow()
  })

  it("상한 이내의 정상 스키마는 그대로 전개한다", () => {
    const fields = schemaToFields({ a: { b: "string" } })
    expect(fields[0]?.fields?.[0]?.name).toBe("b")
  })
})

describe("스칼라 배열의 arrayItemType 보존", () => {
  it("fieldsToSchema는 arrayItemType(예: number)을 items에 기록한다", () => {
    const schema = fieldsToSchema([
      {
        id: "1",
        name: "tags",
        type: "array",
        arrayItemType: "number",
        fakerMethod: "none",
      },
    ])
    // 기본값 string 대신 number가 저장되어야 한다
    expect(schema).toEqual({
      tags: { type: "array", items: "number" },
    })
  })

  it("fields가 빈 배열이어도 arrayItemType(예: number)을 items에 기록한다", () => {
    const schema = fieldsToSchema([
      {
        id: "1",
        name: "tags",
        type: "array",
        fields: [],
        arrayItemType: "number",
        fakerMethod: "none",
      },
    ])
    expect(schema).toEqual({
      tags: { type: "array", items: "number" },
    })
  })

  it("schemaToFields는 items가 프리미티브면 arrayItemType으로 복원한다", () => {
    const fields = schemaToFields({
      scores: { type: "array", items: "number" },
    })
    expect(fields[0]?.arrayItemType).toBe("number")
  })

  it("라운드트립(fieldsToSchema -> schemaToFields) 후에도 arrayItemType이 유지된다", () => {
    const original = [
      {
        id: "1",
        name: "ids",
        type: "array" as const,
        arrayItemType: "uuid" as const,
        fakerMethod: "none",
      },
    ]
    const schema = fieldsToSchema(original)
    const restored = schemaToFields(schema)
    expect(restored[0]?.arrayItemType).toBe("uuid")
  })
})

describe("fieldsToSchema 필드명 정규화", () => {
  it("필드명 앞뒤 공백을 제거한 뒤 스키마 키로 쓴다", () => {
    // 공백이 키에 남으면 목서버 응답에 " email "이 그대로 노출된다
    const schema = fieldsToSchema([
      { id: "f1", name: "  email  ", type: "string", fakerMethod: "none" },
    ])
    expect(Object.keys(schema)).toEqual(["email"])
  })

  it("공백만 있는 이름은 키를 만들지 않는다", () => {
    const schema = fieldsToSchema([
      { id: "f1", name: "   ", type: "string", fakerMethod: "none" },
      { id: "f2", name: "title", type: "string", fakerMethod: "none" },
    ])
    expect(Object.keys(schema)).toEqual(["title"])
  })

  it("중첩 object 하위 필드명도 trim한다", () => {
    const schema = fieldsToSchema([
      {
        id: "u",
        name: " user ",
        type: "object",
        fakerMethod: "none",
        fields: [
          { id: "u1", name: " name ", type: "string", fakerMethod: "none" },
        ],
      },
    ])
    expect(schema).toEqual({ user: { name: "string" } })
  })
})

describe("schemaToFields - 지원하지 않는 원시 타입 교정", () => {
  it("목록에서 제거된 objectId를 string으로 교정한다", () => {
    // 캐스팅만 하면 무효 타입이 생성기까지 내려가 값이 조용히 null이 된다
    const fields = schemaToFields({ _id: "objectId" })
    expect(fields[0]?.type).toBe("string")
  })

  it("오타 등 알 수 없는 타입도 동일하게 교정한다", () => {
    const fields = schemaToFields({ title: "strng" })
    expect(fields[0]?.type).toBe("string")
  })

  it("교정한 필드를 다시 저장하면 무효 타입이 남지 않는다 (자가치유)", () => {
    // 교정하지 않으면 fieldsToSchema가 원래 값을 그대로 되써서 영구히 남는다
    expect(fieldsToSchema(schemaToFields({ _id: "objectId" }))).toEqual({
      _id: "string",
    })
  })

  it("스칼라 배열의 원소 타입도 동일하게 교정한다", () => {
    const fields = schemaToFields({ ids: { type: "array", items: "objectId" } })
    expect(fields[0]?.arrayItemType).toBe("string")
  })

  it("지원하는 타입은 그대로 보존한다 (교정이 과하게 걸리지 않는다)", () => {
    const fields = schemaToFields({ id: "uuid", when: "date", n: "number" })
    expect(fields.map((f) => f.type)).toEqual(["uuid", "date", "number"])
  })
})

describe("normalizeFieldDefs", () => {
  it("지원하지 않는 타입을 string으로 교정한다", () => {
    const fields = normalizeFieldDefs([
      { id: "f1", name: "_id", type: "objectId", fakerMethod: "none" },
    ])
    expect(fields[0]?.type).toBe("string")
  })

  it("object/array는 원시 타입이 아니지만 유효하므로 보존한다", () => {
    const fields = normalizeFieldDefs([
      { id: "f1", name: "author", type: "object", fields: [] },
      { id: "f2", name: "tags", type: "array", fields: [] },
    ])
    expect(fields.map((f) => f.type)).toEqual(["object", "array"])
  })

  it("중첩 필드도 재귀적으로 교정한다", () => {
    const fields = normalizeFieldDefs([
      {
        id: "f1",
        name: "author",
        type: "object",
        fields: [{ id: "f2", name: "_id", type: "objectId" }],
      },
    ])
    expect(fields[0]?.fields?.[0]?.type).toBe("string")
  })

  it("스칼라 배열의 원소 타입도 교정한다", () => {
    const fields = normalizeFieldDefs([
      { id: "f1", name: "ids", type: "array", arrayItemType: "objectId" },
    ])
    expect(fields[0]?.arrayItemType).toBe("string")
  })

  it("fakerMethod 등 나머지 속성은 보존한다", () => {
    // 교정이 faker 선택을 지우면 MCP 재사용 경로에서 사용자 설정이 사라진다
    const fields = normalizeFieldDefs([
      { id: "f1", name: "email", type: "string", fakerMethod: "internet.email" },
    ])
    expect(fields[0]).toMatchObject({
      id: "f1",
      name: "email",
      fakerMethod: "internet.email",
    })
  })

  it("배열이 아니거나 객체가 아닌 항목은 예외 없이 걸러낸다", () => {
    // fieldDefs는 @IsArray()만 걸린 채 저장되므로 형태를 단정할 수 없다
    expect(normalizeFieldDefs(null)).toEqual([])
    expect(normalizeFieldDefs("nope")).toEqual([])
    expect(
      normalizeFieldDefs([null, "x", { id: "f1", name: "ok", type: "string" }]),
    ).toHaveLength(1)
  })
})


