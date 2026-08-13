import {
  SchemaObject,
  SchemaType,
  SchemaPrimitive,
  MAX_SCHEMA_DEPTH,
} from "@workspace/types"
import { formatObjectKey } from "./identifiers"
import { isSchemaArray, schemaToTsInterface } from "./schemaToType"
import { CodeGenContext, CodeLang, ValidationLib } from "./types"

// ---------- zod ----------
const ZOD_BY_PRIMITIVE = {
  string: "z.string()",
  number: "z.number()",
  boolean: "z.boolean()",
  date: "z.string().datetime()",
  uuid: "z.string().uuid()",
} satisfies Record<SchemaPrimitive, string>

function zodExpr(value: SchemaType, indent: number): string {
  if (indent > MAX_SCHEMA_DEPTH) return "z.unknown()"
  if (typeof value === "string") {
    return (ZOD_BY_PRIMITIVE as Record<string, string>)[value] ?? "z.unknown()"
  }
  if (isSchemaArray(value)) return `z.array(${zodExpr(value.items, indent)})`
  // Mixed 타입 저장 경로로 null/비객체가 들어올 수 있다
  if (typeof value !== "object" || value === null) return "z.unknown()"
  return zodObject(value, indent)
}

function zodObject(schema: SchemaObject, indent: number): string {
  const entries = Object.entries(schema)
  if (entries.length === 0) return "z.object({})"
  const pad = "  ".repeat(indent + 1)
  const close = "  ".repeat(indent)
  const lines = entries.map(
    ([key, value]) =>
      `${pad}${formatObjectKey(key)}: ${zodExpr(value, indent + 1)},`
  )
  return `z.object({\n${lines.join("\n")}\n${close}})`
}

// ---------- yup ----------
const YUP_BY_PRIMITIVE = {
  string: "yup.string().required()",
  number: "yup.number().required()",
  boolean: "yup.boolean().required()",
  date: "yup.string().required()",
  uuid: "yup.string().uuid().required()",
} satisfies Record<SchemaPrimitive, string>

function yupExpr(value: SchemaType, indent: number): string {
  if (indent > MAX_SCHEMA_DEPTH) return "yup.mixed()"
  if (typeof value === "string") {
    return (YUP_BY_PRIMITIVE as Record<string, string>)[value] ?? "yup.mixed()"
  }
  if (isSchemaArray(value)) {
    return `yup.array().of(${yupExpr(value.items, indent)}).required()`
  }
  if (typeof value !== "object" || value === null) return "yup.mixed()"
  return yupObject(value, indent)
}

// ---------- joi ----------
const JOI_BY_PRIMITIVE = {
  string: "Joi.string().required()",
  number: "Joi.number().required()",
  boolean: "Joi.boolean().required()",
  date: "Joi.date().iso().required()",
  uuid: "Joi.string().guid().required()",
} satisfies Record<SchemaPrimitive, string>

function joiExpr(value: SchemaType, indent: number): string {
  if (indent > MAX_SCHEMA_DEPTH) return "Joi.any()"
  if (typeof value === "string") {
    return (JOI_BY_PRIMITIVE as Record<string, string>)[value] ?? "Joi.any()"
  }
  if (isSchemaArray(value)) {
    return `Joi.array().items(${joiExpr(value.items, indent)}).required()`
  }
  if (typeof value !== "object" || value === null) return "Joi.any()"
  return joiObject(value, indent)
}

function joiObject(schema: SchemaObject, indent: number): string {
  const entries = Object.entries(schema)
  if (entries.length === 0) return "Joi.object({})"
  const pad = "  ".repeat(indent + 1)
  const close = "  ".repeat(indent)
  const lines = entries.map(
    ([key, value]) =>
      `${pad}${formatObjectKey(key)}: ${joiExpr(value, indent + 1)},`
  )
  return `Joi.object({\n${lines.join("\n")}\n${close}})`
}

function yupObject(schema: SchemaObject, indent: number): string {
  const entries = Object.entries(schema)
  if (entries.length === 0) return "yup.object({})"
  const pad = "  ".repeat(indent + 1)
  const close = "  ".repeat(indent)
  const lines = entries.map(
    ([key, value]) =>
      `${pad}${formatObjectKey(key)}: ${yupExpr(value, indent + 1)},`
  )
  return `yup.object({\n${lines.join("\n")}\n${close}})`
}

/** 선택한 검증 라이브러리·언어에 맞는 스키마 선언 코드를 생성합니다. */
export function buildValidationSnippet(
  ctx: CodeGenContext,
  lib: ValidationLib,
  lang: CodeLang
): string {
  const { schema, resourceName, typeName } = ctx
  const schemaVar = `${resourceName}Schema`

  if (lib === "zod") {
    const lines = [
      `import { z } from "zod";`,
      ``,
      `export const ${schemaVar} = ${zodObject(schema, 0)};`,
      ``,
      `export const ${resourceName}ListSchema = z.array(${schemaVar});`,
    ]
    if (lang === "ts") {
      lines.push(``, `export type ${typeName} = z.infer<typeof ${schemaVar}>;`)
    }
    return lines.join("\n")
  }

  if (lib === "yup") {
    const lines = [
      `import * as yup from "yup";`,
      ``,
      `export const ${schemaVar} = ${yupObject(schema, 0)};`,
      ``,
      `export const ${resourceName}ListSchema = yup.array().of(${schemaVar});`,
    ]
    if (lang === "ts") {
      lines.push(
        ``,
        `export type ${typeName} = yup.InferType<typeof ${schemaVar}>;`
      )
    }
    return lines.join("\n")
  }

  // joi는 타입 추론이 없으므로 TS에서는 인터페이스를 함께 제공합니다.
  const lines = [
    `import Joi from "joi";`,
    ``,
    `export const ${schemaVar} = ${joiObject(schema, 0)};`,
    ``,
    `export const ${resourceName}ListSchema = Joi.array().items(${schemaVar});`,
  ]
  if (lang === "ts") {
    lines.push(``, schemaToTsInterface(schema, typeName))
  }
  return lines.join("\n")
}
