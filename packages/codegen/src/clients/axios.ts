import type { CodeGenContext, CodeLang } from "../types"
import { quoteLiteral, escapeTemplate } from "../identifiers"
import { listSignature } from "../listSignature"
import {
  paginatedResponseInterface,
  listQueryInterface,
} from "../responseTypes"

export function buildAxiosClient(ctx: CodeGenContext, lang: CodeLang): string {
  const { baseUrl, resourcePath, typeName, resourceName, pagination, sort, search } = ctx
  const quotedBaseUrl = quoteLiteral(baseUrl)
  const quotedPath = quoteLiteral(resourcePath)
  const templatePath = escapeTemplate(resourcePath)
  const ts = lang === "ts"
  const listQuery = Boolean(sort || search)
  const listType = pagination ? `${typeName}ListResponse` : `${typeName}[]`

  const lines: string[] = [`import axios from "axios";`]
  if (ts) {
    // 생성된 TS 스니펫이 단독으로 컴파일되도록 타입 import를 함께 출력합니다.
    lines.push(`import type { ${typeName} } from "./${resourceName}Schema";`)
  }
  lines.push(``, `const api = axios.create({ baseURL: ${quotedBaseUrl} });`, ``)
  if (ts && pagination) {
    lines.push(paginatedResponseInterface(typeName), ``)
  }
  if (ts && listQuery) {
    lines.push(listQueryInterface(typeName, sort, search), ``)
  }

  const sig = listSignature(ctx, lang)

  /**
   * axios 요청의 두 번째 인자(줄 배열).
   *
   * 현재 생성 결과의 줄바꿈을 그대로 보존한다 — params가 객체 리터럴이면
   * 다중 행, 변수 하나면 단일 행이다. 테스트가 시그니처 전문을 단언하므로
   * 포맷을 통일하면 회귀로 잡힌다.
   */
  const axiosGetCall = (): string[] => {
    const getExpr = `await api.get${ts ? `<${listType}>` : ""}(${quotedPath}`
    if (sig.hasQuery && sig.hasPaging) {
      return [
        `  const { data } = ${getExpr}, {`,
        `    params: { ...query, ${JSON.stringify(pagination!.pageParam)}: page, ${JSON.stringify(pagination!.limitParam)}: limit },`,
        `  });`,
      ]
    }
    if (sig.hasQuery) {
      return [`  const { data } = ${getExpr}, { params: query });`]
    }
    if (sig.hasPaging) {
      return [
        `  const { data } = ${getExpr}, {`,
        `    params: { ${JSON.stringify(pagination!.pageParam)}: page, ${JSON.stringify(pagination!.limitParam)}: limit },`,
        `  });`,
      ]
    }
    return [`  const { data } = ${getExpr});`]
  }

  lines.push(
    ts
      ? `export async function get${typeName}List(${sig.params}): Promise<${listType}> {`
      : `export async function get${typeName}List(${sig.params}) {`,
    ...axiosGetCall(),
    `  return data;`,
    `}`,
    ``
  )

  lines.push(
    ts
      ? `export async function get${typeName}ById(id: string): Promise<${typeName}> {`
      : `export async function get${typeName}ById(id) {`,
    `  const { data } = await api.get${ts ? `<${typeName}>` : ""}(\`${templatePath}/\${id}\`);`,
    `  return data;`,
    `}`,
    ``,
    ts
      ? `export async function create${typeName}(payload: ${typeName}): Promise<${typeName}> {`
      : `export async function create${typeName}(payload) {`,
    `  const { data } = await api.post${ts ? `<${typeName}>` : ""}(${quotedPath}, payload);`,
    `  return data;`,
    `}`,
    ``,
    ts
      ? `export async function update${typeName}(id: string, payload: Partial<${typeName}>): Promise<${typeName}> {`
      : `export async function update${typeName}(id, payload) {`,
    `  const { data } = await api.put${ts ? `<${typeName}>` : ""}(\`${templatePath}/\${id}\`, payload);`,
    `  return data;`,
    `}`,
    ``,
    ts
      ? `export async function delete${typeName}(id: string): Promise<void> {`
      : `export async function delete${typeName}(id) {`,
    `  await api.delete(\`${templatePath}/\${id}\`);`,
    `}`
  )

  return lines.join("\n")
}
