import { schemaObjectInput, applyFakerHints } from "../schema-input"
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
  it("유효한 dot-path 힌트를 fieldDefs에 적용한다", () => {
    const fields = schemaToFields({
      price: "number",
      author: { name: "string" },
    })

    const { errors } = applyFakerHints(fields, {
      price: "commerce.price",
      "author.name": "person.fullName",
    })

    expect(errors).toEqual([])
    expect(fields.find((f) => f.name === "price")?.fakerMethod).toBe(
      "commerce.price"
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
    expect(errors[0]).toContain("commerce.price")
  })
})
