import type { SchemaObject } from "@workspace/types"
import { toIdentifier, toPascalCase } from "@workspace/codegen/identifiers"
import type { CodeGenContext } from "@workspace/codegen/types"
import type { FileBrowserItemRes } from "./api-client"
import type { McpConfig } from "./config"
import { getMockApiBaseUrl } from "./mock-url"

/** 저장된 아이템과 설정으로 codegen 입력(CodeGenContext)을 조립합니다. (웹 CodeGenPanel과 동일 규칙) */
export function buildCodeContext(
  item: FileBrowserItemRes,
  config: McpConfig
): CodeGenContext {
  const resourceName = toIdentifier(item.name)
  return {
    resourceName,
    typeName: toPascalCase(resourceName),
    baseUrl: getMockApiBaseUrl(config.MOCK_HUB_WORKSPACE_ID, config.MOCK_DOMAIN),
    resourcePath: item.path,
    schema: (item.schema ?? {}) as SchemaObject,
    pagination: item.options?.pagination
      ? {
          pageParam: item.options.paginationParams?.pageParam ?? "page",
          limitParam: item.options.paginationParams?.limitParam ?? "limit",
        }
      : null,
  }
}
