import type { CodeGenContext, CodeLang } from "../types"
import { quoteLiteral, escapeTemplate } from "../identifiers"
import { listSignature } from "../listSignature"
import {
  paginatedResponseInterface,
  listQueryInterface,
} from "../responseTypes"

export function buildFetchClient(ctx: CodeGenContext, lang: CodeLang): string {
  const { baseUrl, resourcePath, typeName, resourceName, pagination, sort, search } = ctx
  const quotedBaseUrl = quoteLiteral(baseUrl)
  const templatePath = escapeTemplate(resourcePath)
  const ts = lang === "ts"
  const listQuery = Boolean(sort || search)
  const listType = pagination ? `${typeName}ListResponse` : `${typeName}[]`

  const lines: string[] = []
  if (ts) {
    // 생성된 TS 스니펫이 단독으로 컴파일되도록 타입 import를 함께 출력합니다.
    lines.push(`import type { ${typeName} } from "./${resourceName}Schema";`, ``)
  }
  lines.push(`const BASE_URL = ${quotedBaseUrl};`, ``)

  // 공통 헬퍼 함수: 단일 객체와 컬렉션 모두에서 사용되므로 최상단에 배치합니다.
  lines.push(
    ts
      ? `async function handleResponse<T>(res: Response): Promise<T> {`
      : `async function handleResponse(res) {`,
    `  if (!res.ok) throw new Error(\`요청 실패: \${res.status}\`);`,
    ts ? `  return res.json() as Promise<T>;` : `  return res.json();`,
    `}`,
    ``
  )

  // 단일 객체(Object) 리소스는 목록 인터페이스 생성 이전에 조기 반환(Early Return)합니다.
  if (ctx.resourceType === "object") {
    lines.push(
      ts
        ? `export async function get${typeName}(): Promise<${typeName}> {`
        : `export async function get${typeName}() {`,
      `  const res = await fetch(\`\${BASE_URL}${templatePath}\`);`,
      ts ? `  return handleResponse<${typeName}>(res);` : `  return handleResponse(res);`,
      `}`,
      ``,
      ts
        ? `export async function create${typeName}(payload: ${typeName}): Promise<${typeName}> {`
        : `export async function create${typeName}(payload) {`,
      `  const res = await fetch(\`\${BASE_URL}${templatePath}\`, {`,
      `    method: "POST",`,
      `    headers: { "Content-Type": "application/json" },`,
      `    body: JSON.stringify(payload),`,
      `  });`,
      ts ? `  return handleResponse<${typeName}>(res);` : `  return handleResponse(res);`,
      `}`,
      ``,
      ts
        ? `export async function update${typeName}(payload: ${typeName}): Promise<${typeName}> {`
        : `export async function update${typeName}(payload) {`,
      `  const res = await fetch(\`\${BASE_URL}${templatePath}\`, {`,
      `    method: "PUT",`,
      `    headers: { "Content-Type": "application/json" },`,
      `    body: JSON.stringify(payload),`,
      `  });`,
      ts ? `  return handleResponse<${typeName}>(res);` : `  return handleResponse(res);`,
      `}`,
      ``,
      ts
        ? `export async function patch${typeName}(payload: Partial<${typeName}>): Promise<${typeName}> {`
        : `export async function patch${typeName}(payload) {`,
      `  const res = await fetch(\`\${BASE_URL}${templatePath}\`, {`,
      `    method: "PATCH",`,
      `    headers: { "Content-Type": "application/json" },`,
      `    body: JSON.stringify(payload),`,
      `  });`,
      ts ? `  return handleResponse<${typeName}>(res);` : `  return handleResponse(res);`,
      `}`,
      ``,
      ts
        ? `export async function delete${typeName}(): Promise<void> {`
        : `export async function delete${typeName}() {`,
      `  const res = await fetch(\`\${BASE_URL}${templatePath}\`, { method: "DELETE" });`,
      `  if (!res.ok) throw new Error(\`요청 실패: \${res.status}\`);`,
      `}`
    )
    return lines.join("\n")
  }

  // 컬렉션(Collection) 모드: 단일 객체 분기를 통과한 컬렉션 리소스만 목록용 인터페이스를 선언합니다.
  if (ts && pagination) {
    lines.push(paginatedResponseInterface(typeName), ``)
  }
  if (ts && listQuery) {
    lines.push(listQueryInterface(typeName, sort, search), ``)
  }

  const sig = listSignature(ctx, lang)

  const fetchGetCall = (): string[] => {
    if (sig.hasQuery) {
      const getLines = [
        `  const params = new URLSearchParams();`,
        `  Object.entries(query).forEach(([key, value]) => {`,
        `    if (value !== undefined) params.set(key, String(value));`,
        `  });`,
      ]
      if (sig.hasPaging) {
        getLines.push(
          `  params.set(${JSON.stringify(pagination!.pageParam)}, String(page));`,
          `  params.set(${JSON.stringify(pagination!.limitParam)}, String(limit));`,
        )
      }
      getLines.push(
        `  const res = await fetch(\`\${BASE_URL}${templatePath}?\${params}\`);`,
        ts ? `  return handleResponse<${listType}>(res);` : `  return handleResponse(res);`,
      )
      return getLines
    }
    if (sig.hasPaging) {
      return [
        `  const params = new URLSearchParams({`,
        `    ${JSON.stringify(pagination!.pageParam)}: String(page),`,
        `    ${JSON.stringify(pagination!.limitParam)}: String(limit),`,
        `  });`,
        `  const res = await fetch(\`\${BASE_URL}${templatePath}?\${params}\`);`,
        ts
          ? `  return handleResponse<${listType}>(res);`
          : `  return handleResponse(res);`,
      ]
    }
    return [
      `  const res = await fetch(\`\${BASE_URL}${templatePath}\`);`,
      ts
        ? `  return handleResponse<${listType}>(res);`
        : `  return handleResponse(res);`,
    ]
  }

  lines.push(
    ts
      ? `export async function get${typeName}List(${sig.params}): Promise<${listType}> {`
      : `export async function get${typeName}List(${sig.params}) {`,
    ...fetchGetCall(),
    `}`,
    ``
  )

  lines.push(
    ts
      ? `export async function get${typeName}ById(id: string): Promise<${typeName}> {`
      : `export async function get${typeName}ById(id) {`,
    `  const res = await fetch(\`\${BASE_URL}${templatePath}/\${id}\`);`,
    ts
      ? `  return handleResponse<${typeName}>(res);`
      : `  return handleResponse(res);`,
    `}`,
    ``,
    ts
      ? `export async function create${typeName}(payload: ${typeName}): Promise<${typeName}> {`
      : `export async function create${typeName}(payload) {`,
    `  const res = await fetch(\`\${BASE_URL}${templatePath}\`, {`,
    `    method: "POST",`,
    `    headers: { "Content-Type": "application/json" },`,
    `    body: JSON.stringify(payload),`,
    `  });`,
    ts
      ? `  return handleResponse<${typeName}>(res);`
      : `  return handleResponse(res);`,
    `}`,
    ``,
    ts
      ? `export async function update${typeName}(id: string, payload: Partial<${typeName}>): Promise<${typeName}> {`
      : `export async function update${typeName}(id, payload) {`,
    `  const res = await fetch(\`\${BASE_URL}${templatePath}/\${id}\`, {`,
    `    method: "PUT",`,
    `    headers: { "Content-Type": "application/json" },`,
    `    body: JSON.stringify(payload),`,
    `  });`,
    ts
      ? `  return handleResponse<${typeName}>(res);`
      : `  return handleResponse(res);`,
    `}`,
    ``,
    ts
      ? `export async function delete${typeName}(id: string): Promise<void> {`
      : `export async function delete${typeName}(id) {`,
    `  const res = await fetch(\`\${BASE_URL}${templatePath}/\${id}\`, { method: "DELETE" });`,
    `  if (!res.ok) throw new Error(\`요청 실패: \${res.status}\`);`,
    `}`
  )

  return lines.join("\n")
}
