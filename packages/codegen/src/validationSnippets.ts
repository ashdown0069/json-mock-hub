import { SchemaObject, SchemaType } from "@workspace/types"
import { formatObjectKey } from "./identifiers"
import { isSchemaArray, schemaToTsInterface } from "./schemaToType"
import { CodeGenContext, CodeLang, ValidationLib } from "./types"

// ---------- zod ----------
function zodExpr(value: SchemaType, indent: number): string {
  if (typeof value === "string") {
    switch (value) {
      case "number":
        return "z.number()"
      case "boolean":
        return "z.boolean()"
      case "date":
        return "z.string().datetime()"
      case "uuid":
        return "z.string().uuid()"
      default:
        return "z.string()"
    }
  }
  if (isSchemaArray(value)) return `z.array(${zodExpr(value.items, indent)})`
  return zodObject(value as SchemaObject, indent)
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
function yupExpr(value: SchemaType, indent: number): string {
  if (typeof value === "string") {
    switch (value) {
      case "number":
        return "yup.number().required()"
      case "boolean":
        return "yup.boolean().required()"
      case "uuid":
        return "yup.string().uuid().required()"
      // 목 데이터의 date는 ISO 문자열로 저장되므로 string으로 검증합니다.
      case "date":
      default:
        return "yup.string().required()"
    }
  }
  if (isSchemaArray(value)) {
    return `yup.array().of(${yupExpr(value.items, indent)}).required()`
  }
  return yupObject(value as SchemaObject, indent)
}

// ---------- joi ----------
function joiExpr(value: SchemaType, indent: number): string {
  if (typeof value === "string") {
    switch (value) {
      case "number":
        return "Joi.number().required()"
      case "boolean":
        return "Joi.boolean().required()"
      case "uuid":
        return "Joi.string().guid().required()"
      case "date":
        return "Joi.date().iso().required()"
      default:
        return "Joi.string().required()"
    }
  }
  if (isSchemaArray(value)) {
    return `Joi.array().items(${joiExpr(value.items, indent)}).required()`
  }
  return joiObject(value as SchemaObject, indent)
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
