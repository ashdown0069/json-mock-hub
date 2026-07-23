import { CodeGenContext, CodeLang } from "./types"

/**
 * TanStack Query v5 훅 코드를 생성합니다.
 * 함수명은 clientSnippets와 동일한 규칙(get{TypeName}List 등)을 사용해 연결됩니다.
 */
export function buildQuerySnippet(ctx: CodeGenContext, lang: CodeLang): string {
  const { resourceName, typeName, pagination } = ctx
  const ts = lang === "ts"
  const keysVar = `${resourceName}Keys`

  const lines: string[] = [
    `import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";`,
    `import {`,
    `  get${typeName}List,`,
    `  get${typeName}ById,`,
    `  create${typeName},`,
    `  update${typeName},`,
    `  delete${typeName},`,
    `} from "./${resourceName}Api";`,
  ]
  if (ts) {
    // 생성된 TS 스니펫이 단독으로 컴파일되도록 타입 import를 함께 출력합니다.
    lines.push(`import type { ${typeName} } from "./${resourceName}Schema";`)
  }
  lines.push(``)

  lines.push(
    `export const ${keysVar} = {`,
    ts
      ? `  all: [${JSON.stringify(resourceName)}] as const,`
      : `  all: [${JSON.stringify(resourceName)}],`,
    ts
      ? `  detail: (id: string) => [...${keysVar}.all, id] as const,`
      : `  detail: (id) => [...${keysVar}.all, id],`,
    `};`,
    ``
  )

  // 목록 조회 훅
  if (pagination) {
    lines.push(
      `export function use${typeName}ListQuery(page = 1, limit = 10) {`,
      `  return useQuery({`,
      ts
        ? `    queryKey: [...${keysVar}.all, { page, limit }] as const,`
        : `    queryKey: [...${keysVar}.all, { page, limit }],`,
      `    queryFn: () => get${typeName}List(page, limit),`,
      `  });`,
      `}`,
      ``
    )
  } else {
    lines.push(
      `export function use${typeName}ListQuery() {`,
      `  return useQuery({`,
      `    queryKey: ${keysVar}.all,`,
      `    queryFn: () => get${typeName}List(),`,
      `  });`,
      `}`,
      ``
    )
  }

  lines.push(
    // 단건 조회 훅
    ts
      ? `export function use${typeName}Query(id: string) {`
      : `export function use${typeName}Query(id) {`,
    `  return useQuery({`,
    `    queryKey: ${keysVar}.detail(id),`,
    `    queryFn: () => get${typeName}ById(id),`,
    `    enabled: Boolean(id),`,
    `  });`,
    `}`,
    ``,
    // 생성 뮤테이션
    `export function useCreate${typeName}Mutation() {`,
    `  const queryClient = useQueryClient();`,
    `  return useMutation({`,
    `    mutationFn: create${typeName},`,
    `    onSuccess: () => {`,
    `      queryClient.invalidateQueries({ queryKey: ${keysVar}.all });`,
    `    },`,
    `  });`,
    `}`,
    ``,
    // 수정 뮤테이션
    `export function useUpdate${typeName}Mutation() {`,
    `  const queryClient = useQueryClient();`,
    `  return useMutation({`,
    ts
      ? `    mutationFn: ({ id, payload }: { id: string; payload: Partial<${typeName}> }) =>`
      : `    mutationFn: ({ id, payload }) =>`,
    `      update${typeName}(id, payload),`,
    `    onSuccess: () => {`,
    `      queryClient.invalidateQueries({ queryKey: ${keysVar}.all });`,
    `    },`,
    `  });`,
    `}`,
    ``,
    // 삭제 뮤테이션
    `export function useDelete${typeName}Mutation() {`,
    `  const queryClient = useQueryClient();`,
    `  return useMutation({`,
    ts
      ? `    mutationFn: (id: string) => delete${typeName}(id),`
      : `    mutationFn: (id) => delete${typeName}(id),`,
    `    onSuccess: () => {`,
    `      queryClient.invalidateQueries({ queryKey: ${keysVar}.all });`,
    `    },`,
    `  });`,
    `}`
  )

  return lines.join("\n")
}
