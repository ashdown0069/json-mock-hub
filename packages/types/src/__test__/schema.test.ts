import { SCHEMA_PRIMITIVES, FIELD_TYPES, isSchemaPrimitive } from "../schema"

describe("SCHEMA_PRIMITIVES", () => {
  it("objectId를 더 이상 포함하지 않는다 (uuid로 통합됨)", () => {
    expect(SCHEMA_PRIMITIVES).not.toContain("objectId")
  })

  it("uuid는 여전히 포함한다", () => {
    expect(SCHEMA_PRIMITIVES).toContain("uuid")
  })
})

describe("FIELD_TYPES", () => {
  it("SCHEMA_PRIMITIVES에서 파생되므로 objectId를 포함하지 않는다", () => {
    expect(FIELD_TYPES).not.toContain("objectId")
  })

  it("object/array는 여전히 포함한다", () => {
    expect(FIELD_TYPES).toEqual(
      expect.arrayContaining(["object", "array"])
    )
  })
})

describe("isSchemaPrimitive", () => {
  it("현재 지원하는 원시 타입은 통과시킨다", () => {
    expect(isSchemaPrimitive("string")).toBe(true)
    expect(isSchemaPrimitive("uuid")).toBe(true)
  })

  it("목록에서 제거된 objectId는 거부한다", () => {
    // 유효하지 않은 타입 문자열이 통과하면 생성기가 null을 반환하는 오류가 발생할 수 있다
    expect(isSchemaPrimitive("objectId")).toBe(false)
  })

  it("object/array는 원시 타입이 아니므로 거부한다", () => {
    expect(isSchemaPrimitive("object")).toBe(false)
    expect(isSchemaPrimitive("array")).toBe(false)
  })

  it("문자열이 아닌 값도 예외 없이 거부한다", () => {
    // 런타임에 null·객체·숫자 등 비정상 타입이 유입되더라도 예외 없이 false로 안전하게 차단한다
    expect(isSchemaPrimitive(null)).toBe(false)
    expect(isSchemaPrimitive(undefined)).toBe(false)
    expect(isSchemaPrimitive({})).toBe(false)
    expect(isSchemaPrimitive(7)).toBe(false)
  })
})
