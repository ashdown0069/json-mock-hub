import { buildValidationSnippet } from "../validationSnippets"
import { CodeGenContext } from "../types"
import { SCHEMA_PRIMITIVES } from "@workspace/types"

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
  resourceType: "collection",
  pagination: null,
  sort: null,
  search: null,
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

describe("buildValidationSnippet — 비정상 값 방어", () => {
  const ctxWith = (schema: unknown) =>
    ({
      resourceName: "users",
      typeName: "Users",
      baseUrl: "http://localhost:4001/api",
      resourcePath: "/users",
      schema,
      pagination: null,
      sort: null,
      search: null,
    }) as never

  it("zod: null 값에 크래시하지 않고 z.unknown()으로 폴백한다", () => {
    expect(() =>
      buildValidationSnippet(ctxWith({ a: null }), "zod", "ts")
    ).not.toThrow()
    expect(buildValidationSnippet(ctxWith({ a: null }), "zod", "ts")).toContain(
      "z.unknown()"
    )
  })

  it("yup: null 값에 크래시하지 않고 yup.mixed()로 폴백한다", () => {
    expect(buildValidationSnippet(ctxWith({ a: null }), "yup", "ts")).toContain(
      "yup.mixed()"
    )
  })

  it("joi: null 값에 크래시하지 않고 Joi.any()로 폴백한다", () => {
    expect(buildValidationSnippet(ctxWith({ a: null }), "joi", "ts")).toContain(
      "Joi.any()"
    )
  })

  it("zod: 숫자 같은 비객체 값도 z.unknown()으로 폴백한다", () => {
    expect(buildValidationSnippet(ctxWith({ a: 123 }), "zod", "ts")).toContain(
      "z.unknown()"
    )
  })
})

describe("원시 타입 매핑의 누락 방지", () => {
  it.each(["zod", "yup", "joi"] as const)(
    "%s는 모든 원시 타입에 대해 폴백이 아닌 표현을 만든다",
    (lib) => {
      const schema = Object.fromEntries(
        SCHEMA_PRIMITIVES.map((primitive) => [`f_${primitive}`, primitive]),
      )
      const code = buildValidationSnippet(
        { ...ctx, schema: schema as never },
        lib,
        "ts",
      )

      for (const primitive of SCHEMA_PRIMITIVES) {
        expect(code).toContain(`f_${primitive}:`)
      }
      expect(code.split("\n").length).toBeGreaterThan(SCHEMA_PRIMITIVES.length)
    },
  )
})
