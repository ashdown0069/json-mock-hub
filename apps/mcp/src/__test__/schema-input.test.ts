import { SCHEMA_PRIMITIVES } from "@workspace/types"
import {
  schemaObjectInput,
  schemaTypeInput,
  SCHEMA_VALUE_TYPES_HINT,
  applyFakerHints,
} from "../schema-input"
import { schemaToFields } from "@workspace/mockgen/convertSchema"

describe("schemaObjectInput", () => {
  it("기본 타입/배열/중첩 객체 스키마를 통과시킨다", () => {
    const input = {
      name: "string",
      price: "number",
      tags: { type: "array", items: "string" },
      author: { name: "string", age: "number" },
    }
    expect(schemaObjectInput.safeParse(input).success).toBe(true)
  })

  it("허용되지 않는 기본 타입은 거부한다", () => {
    expect(schemaObjectInput.safeParse({ name: "text" }).success).toBe(false)
  })
})

describe("applyFakerHints", () => {
  it("유효한 dot-path 힌트를 fields에 적용한다", () => {
    const fields = schemaToFields({
      price: "number",
      author: { name: "string" },
    })

    const { errors } = applyFakerHints(fields, {
      price: "number.int",
      "author.name": "person.fullName",
    })

    expect(errors).toEqual([])
    expect(fields.find((f) => f.name === "price")?.fakerMethod).toBe(
      "number.int"
    )
    expect(
      fields
        .find((f) => f.name === "author")
        ?.fields?.find((f) => f.name === "name")?.fakerMethod
    ).toBe("person.fullName")
  })

  it("존재하지 않는 경로는 오류로 수집한다", () => {
    const fields = schemaToFields({ name: "string" })
    const { errors } = applyFakerHints(fields, { missing: "person.fullName" })
    expect(errors).toHaveLength(1)
  })

  it("타입에 맞지 않는 faker 메서드는 유효 목록과 함께 오류로 수집한다", () => {
    const fields = schemaToFields({ price: "number" })
    const { errors } = applyFakerHints(fields, { price: "person.fullName" })
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain("number.int")
  })
})

describe("primitiveInput — objectId 제거", () => {
  it("objectId는 더 이상 유효한 스키마 값 타입이 아니다 (uuid로 통합됨)", () => {
    const result = schemaTypeInput.safeParse("objectId")
    expect(result.success).toBe(false)
  })

  it("uuid는 여전히 유효하다", () => {
    const result = schemaTypeInput.safeParse("uuid")
    expect(result.success).toBe(true)
  })
})

describe("primitiveInput — SCHEMA_PRIMITIVES 파생", () => {
  // 이 테스트는 "지금 깨진 것"을 잡지 않는다. 목록을 다시 하드코딩으로 되돌리는
  // 회귀를 잡는 계약 테스트다 — objectId 제거 때 실제로 이 지점만 뒤처졌다.
  it("지원 목록의 모든 원시 타입을 통과시킨다", () => {
    for (const primitive of SCHEMA_PRIMITIVES) {
      expect(schemaTypeInput.safeParse(primitive).success).toBe(true)
    }
  })

  it("목록에 없는 값은 거부한다", () => {
    expect(schemaTypeInput.safeParse("objectId").success).toBe(false)
    expect(schemaTypeInput.safeParse("text").success).toBe(false)
  })

  it("도구 설명 문구가 지원 목록과 어긋나지 않는다", () => {
    // 문구가 실제 허용 타입과 갈리면 LLM이 거부당할 값을 계속 제안한다
    for (const primitive of SCHEMA_PRIMITIVES) {
      expect(SCHEMA_VALUE_TYPES_HINT).toContain(`"${primitive}"`)
    }
    expect(SCHEMA_VALUE_TYPES_HINT).not.toContain('"objectId"')
  })
})
