import { CodeGenContext, CodeLang, HttpClientLib } from "./types"

/** 페이지네이션 목록 응답 타입 선언 (mockserver의 PaginatedBody와 동일 형태) */
function paginatedResponseInterface(typeName: string): string {
  return [
    `export interface ${typeName}ListResponse {`,
    `  data: ${typeName}[];`,
    `  meta: {`,
    `    page: number;`,
    `    limit: number;`,
    `    totalItems: number;`,
    `    totalPages: number;`,
    `    hasNext: boolean;`,
    `    hasPrev: boolean;`,
    `  };`,
    `}`,
  ].join("\n")
}

function buildAxiosClient(ctx: CodeGenContext, lang: CodeLang): string {
  const { baseUrl, resourcePath, typeName, resourceName, pagination } = ctx
  const ts = lang === "ts"
  const listType = pagination ? `${typeName}ListResponse` : `${typeName}[]`

  const lines: string[] = [`import axios from "axios";`]
  if (ts) {
    // 생성된 TS 스니펫이 단독으로 컴파일되도록 타입 import를 함께 출력합니다.
    lines.push(`import type { ${typeName} } from "./${resourceName}Schema";`)
  }
  lines.push(``, `const api = axios.create({ baseURL: "${baseUrl}" });`, ``)
  if (ts && pagination) {
    lines.push(paginatedResponseInterface(typeName), ``)
  }

  // 목록 조회
  if (pagination) {
    lines.push(
      ts
        ? `export async function get${typeName}List(page = 1, limit = 10): Promise<${listType}> {`
        : `export async function get${typeName}List(page = 1, limit = 10) {`,
      `  const { data } = await api.get${ts ? `<${listType}>` : ""}("${resourcePath}", {`,
      `    params: { ${JSON.stringify(pagination.pageParam)}: page, ${JSON.stringify(pagination.limitParam)}: limit },`,
      `  });`,
      `  return data;`,
      `}`,
      ``
    )
  } else {
    lines.push(
      ts
        ? `export async function get${typeName}List(): Promise<${listType}> {`
        : `export async function get${typeName}List() {`,
      `  const { data } = await api.get${ts ? `<${listType}>` : ""}("${resourcePath}");`,
      `  return data;`,
      `}`,
      ``
    )
  }

  lines.push(
    // 단건 조회
    ts
      ? `export async function get${typeName}ById(id: string): Promise<${typeName}> {`
      : `export async function get${typeName}ById(id) {`,
    `  const { data } = await api.get${ts ? `<${typeName}>` : ""}(\`${resourcePath}/\${id}\`);`,
    `  return data;`,
    `}`,
    ``,
    // 생성
    ts
      ? `export async function create${typeName}(payload: ${typeName}): Promise<${typeName}> {`
      : `export async function create${typeName}(payload) {`,
    `  const { data } = await api.post${ts ? `<${typeName}>` : ""}("${resourcePath}", payload);`,
    `  return data;`,
    `}`,
    ``,
    // 수정
    ts
      ? `export async function update${typeName}(id: string, payload: Partial<${typeName}>): Promise<${typeName}> {`
      : `export async function update${typeName}(id, payload) {`,
    `  const { data } = await api.put${ts ? `<${typeName}>` : ""}(\`${resourcePath}/\${id}\`, payload);`,
    `  return data;`,
    `}`,
    ``,
    // 삭제
    ts
      ? `export async function delete${typeName}(id: string): Promise<void> {`
      : `export async function delete${typeName}(id) {`,
    `  await api.delete(\`${resourcePath}/\${id}\`);`,
    `}`
  )

  return lines.join("\n")
}

function buildFetchClient(ctx: CodeGenContext, lang: CodeLang): string {
  const { baseUrl, resourcePath, typeName, resourceName, pagination } = ctx
  const ts = lang === "ts"
  const listType = pagination ? `${typeName}ListResponse` : `${typeName}[]`

  const lines: string[] = []
  if (ts) {
    // 생성된 TS 스니펫이 단독으로 컴파일되도록 타입 import를 함께 출력합니다.
    lines.push(`import type { ${typeName} } from "./${resourceName}Schema";`, ``)
  }
  lines.push(`const BASE_URL = "${baseUrl}";`, ``)
  if (ts && pagination) {
    lines.push(paginatedResponseInterface(typeName), ``)
  }
  lines.push(
    ts
      ? `async function handleResponse<T>(res: Response): Promise<T> {`
      : `async function handleResponse(res) {`,
    `  if (!res.ok) throw new Error(\`요청 실패: \${res.status}\`);`,
    ts ? `  return res.json() as Promise<T>;` : `  return res.json();`,
    `}`,
    ``
  )

  // 목록 조회
  if (pagination) {
    lines.push(
      ts
        ? `export async function get${typeName}List(page = 1, limit = 10): Promise<${listType}> {`
        : `export async function get${typeName}List(page = 1, limit = 10) {`,
      `  const params = new URLSearchParams({`,
      `    ${JSON.stringify(pagination.pageParam)}: String(page),`,
      `    ${JSON.stringify(pagination.limitParam)}: String(limit),`,
      `  });`,
      `  const res = await fetch(\`\${BASE_URL}${resourcePath}?\${params}\`);`,
      ts
        ? `  return handleResponse<${listType}>(res);`
        : `  return handleResponse(res);`,
      `}`,
      ``
    )
  } else {
    lines.push(
      ts
        ? `export async function get${typeName}List(): Promise<${listType}> {`
        : `export async function get${typeName}List() {`,
      `  const res = await fetch(\`\${BASE_URL}${resourcePath}\`);`,
      ts
        ? `  return handleResponse<${listType}>(res);`
        : `  return handleResponse(res);`,
      `}`,
      ``
    )
  }

  lines.push(
    // 단건 조회
    ts
      ? `export async function get${typeName}ById(id: string): Promise<${typeName}> {`
      : `export async function get${typeName}ById(id) {`,
    `  const res = await fetch(\`\${BASE_URL}${resourcePath}/\${id}\`);`,
    ts
      ? `  return handleResponse<${typeName}>(res);`
      : `  return handleResponse(res);`,
    `}`,
    ``,
    // 생성
    ts
      ? `export async function create${typeName}(payload: ${typeName}): Promise<${typeName}> {`
      : `export async function create${typeName}(payload) {`,
    `  const res = await fetch(\`\${BASE_URL}${resourcePath}\`, {`,
    `    method: "POST",`,
    `    headers: { "Content-Type": "application/json" },`,
    `    body: JSON.stringify(payload),`,
    `  });`,
    ts
      ? `  return handleResponse<${typeName}>(res);`
      : `  return handleResponse(res);`,
    `}`,
    ``,
    // 수정
    ts
      ? `export async function update${typeName}(id: string, payload: Partial<${typeName}>): Promise<${typeName}> {`
      : `export async function update${typeName}(id, payload) {`,
    `  const res = await fetch(\`\${BASE_URL}${resourcePath}/\${id}\`, {`,
    `    method: "PUT",`,
    `    headers: { "Content-Type": "application/json" },`,
    `    body: JSON.stringify(payload),`,
    `  });`,
    ts
      ? `  return handleResponse<${typeName}>(res);`
      : `  return handleResponse(res);`,
    `}`,
    ``,
    // 삭제
    ts
      ? `export async function delete${typeName}(id: string): Promise<void> {`
      : `export async function delete${typeName}(id) {`,
    `  const res = await fetch(\`\${BASE_URL}${resourcePath}/\${id}\`, { method: "DELETE" });`,
    `  if (!res.ok) throw new Error(\`요청 실패: \${res.status}\`);`,
    `}`
  )

  return lines.join("\n")
}

/** 선택한 HTTP 클라이언트·언어에 맞는 CRUD 호출 코드를 생성합니다. */
export function buildClientSnippet(
  ctx: CodeGenContext,
  client: HttpClientLib,
  lang: CodeLang
): string {
  return client === "axios"
    ? buildAxiosClient(ctx, lang)
    : buildFetchClient(ctx, lang)
}
