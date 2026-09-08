import {
  resolveMockApiParams,
  type FieldSchema,
  type MockApiOptions,
  type SchemaObject,
} from "@workspace/types"
import { fieldsToSchema, withIdField } from "@workspace/mockgen/convertSchema"
import { toIdentifier, toPascalCase } from "./identifiers"
import type { CodeGenContext } from "./types"

/** 코드 생성에 필요한 아이템 정보 — web의 FileItem과 mcp의 FileBrowserItemRes가 모두 만족한다. */
export interface CodeGenItemInput {
  name: string
  path?: string | null
  fields?: FieldSchema[] | null
  options?: MockApiOptions | null
}

/**
 * 저장된 아이템 + 환경으로 codegen 입력을 조립한다.
 *
 * schema 필드가 제거되고 fields 단일 모델로 통합됨에 따라,
 * fieldsToSchema를 통해 저장된 fields로부터 스키마를 동적으로 파생한다.
 * 컬렉션 모드(!isObject)에서는 시스템 예약 필드 id("number")를 최상위에 자동 주입한다.
 */
export function buildCodeGenContext(
  item: CodeGenItemInput,
  env: { baseUrl: string },
): CodeGenContext {
  const resourceName = toIdentifier(item.name)
  const isObject = item.options?.resourceType === "object"

  // SSOT 원칙: item.fields로부터 fieldsToSchema를 통해 JSON Schema 단일 파생
  const rawSchema = fieldsToSchema(item.fields ?? [])

  // 시스템 ID 보장: 컬렉션 모드에서는 시스템 예약 필드 id("number")를 첫 번째 키로 자동 주입한다.
  const hasFields = (item.fields?.length ?? 0) > 0
  const shouldInjectId =
    !isObject && (hasFields || item.options?.resourceType === "collection")

  const schema = (
    shouldInjectId ? withIdField(rawSchema) : rawSchema
  ) as SchemaObject

  return {
    resourceName,
    typeName: toPascalCase(resourceName),
    baseUrl: env.baseUrl,
    resourcePath: item.path ?? `/${item.name}`,
    schema,
    ...resolveMockApiParams(item.options),
  }
}
