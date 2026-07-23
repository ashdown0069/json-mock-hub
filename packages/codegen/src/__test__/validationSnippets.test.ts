import { buildValidationSnippet } from "../validationSnippets"
import { CodeGenContext } from "../types"

const ctx: CodeGenContext = {
  resourceName: "users",
  typeName: "Users",
  baseUrl: "http://ws1.localhost:3000/api",
  resourcePath: "/users",
  schema: {
    id: "uuid",
    name: "string",
    age: "number",
    active: "boolean",
    createdAt: "date",
    profile: { bio: "string" },
    tags: { type: "array", items: "string" },
  },
  pagination: null,
}

describe("buildValidationSnippet - zod", () => {
  it("타입별 zod 체인을 생성한다", () => {
    const code = buildValidationSnippet(ctx, "zod", "js")
    expect(code).toContain('import { z } from "zod";')
    expect(code).toContain("id: z.string().uuid(),")
    expect(code).toContain("age: z.number(),")
    expect(code).toContain("active: z.boolean(),")
    expect(code).toContain("createdAt: z.string().datetime(),")
    expect(code).toContain("tags: z.array(z.string()),")
    expect(code).toContain(
      "export const usersListSchema = z.array(usersSchema);"
    )
  })

  it("TS에서는 z.infer 타입을 추가한다", () => {
    const code = buildValidationSnippet(ctx, "zod", "ts")
    expect(code).toContain("export type Users = z.infer<typeof usersSchema>;")
  })

  it("JS에서는 타입 선언을 포함하지 않는다", () => {
    const code = buildValidationSnippet(ctx, "zod", "js")
    expect(code).not.toContain("z.infer")
  })
})

describe("buildValidationSnippet - yup", () => {
  it("타입별 yup 체인을 생성한다", () => {
    const code = buildValidationSnippet(ctx, "yup", "js")
    expect(code).toContain('import * as yup from "yup";')
    expect(code).toContain("id: yup.string().uuid().required(),")
    expect(code).toContain("age: yup.number().required(),")
    expect(code).toContain(
      "tags: yup.array().of(yup.string().required()).required(),"
    )
  })

  it("TS에서는 InferType 타입을 추가한다", () => {
    const code = buildValidationSnippet(ctx, "yup", "ts")
    expect(code).toContain(
      "export type Users = yup.InferType<typeof usersSchema>;"
    )
  })
})

describe("buildValidationSnippet - joi", () => {
  it("타입별 Joi 체인을 생성한다", () => {
    const code = buildValidationSnippet(ctx, "joi", "js")
    expect(code).toContain('import Joi from "joi";')
    expect(code).toContain("createdAt: Joi.date().iso().required(),")
    expect(code).toContain("id: Joi.string().guid().required(),")
    expect(code).toContain(
      "tags: Joi.array().items(Joi.string().required()).required(),"
    )
  })

  it("TS에서는 인터페이스 선언을 함께 생성한다", () => {
    const code = buildValidationSnippet(ctx, "joi", "ts")
    expect(code).toContain("export interface Users {")
  })
})
