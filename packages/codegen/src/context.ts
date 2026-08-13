import {
  resolveMockApiParams,
  type MockApiOptions,
  type SchemaObject,
} from "@workspace/types"
import { toIdentifier, toPascalCase } from "./identifiers"
import type { CodeGenContext } from "./types"

/** 코드 생성에 필요한 아이템 정보 — web의 FileItem과 mcp의 FileBrowserItemRes가 모두 만족한다. */
export interface CodeGenItemInput {
  name: string
  path?: string | null
  schema?: unknown
  options?: MockApiOptions | null
}

/**
 * 저장된 아이템 + 환경으로 codegen 입력을 조립한다.
 *
 * web과 mcp가 각자 조립하던 것을 여기로 모았다 — 이전에 web은 sort/search를
 * 넣고 mcp는 빠뜨려서, get_api_code가 정렬·검색이 켜진 API에 대해 해당
 * 파라미터가 없는 클라이언트 코드를 내보내는 드리프트가 실제로 발생했다.
 *
 * baseUrl을 인자로 받는 이유: 목서버 도메인은 web에서 NEXT_PUBLIC_* 환경변수,
 * mcp에서 config.MOCK_DOMAIN에서 온다. env 접근을 호출부에 두어 패키지가
 * 실행 환경을 알지 못하게 한다.
 */
export function buildCodeGenContext(
  item: CodeGenItemInput,
  env: { baseUrl: string },
): CodeGenContext {
  const resourceName = toIdentifier(item.name)
  return {
    resourceName,
    typeName: toPascalCase(resourceName),
    baseUrl: env.baseUrl,
    resourcePath: item.path ?? `/${item.name}`,
    schema: (item.schema ?? {}) as SchemaObject,
    ...resolveMockApiParams(item.options),
  }
}
