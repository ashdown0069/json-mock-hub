import { CodeGenContext, CodeLang } from "./types"
import { listSignature } from "./listSignature"

/**
 * TanStack Query v5 훅 코드를 생성합니다.
 * 함수명은 clientSnippets와 동일한 규칙(get{TypeName}List 등)을 사용해 연결됩니다.
 */
export function buildQuerySnippet(
  ctx: CodeGenContext,
  lang: CodeLang
): string {
  const { resourceName, typeName } = ctx
  const ts = lang === "ts"
  const keysVar = `${resourceName}Keys`

  if (ctx.resourceType === "object") {
    const lines: string[] = [
      `import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";`,
      `import {`,
      `  get${typeName},`,
      `  create${typeName},`,
      `  update${typeName},`,
      `  patch${typeName},`,
      `  delete${typeName},`,
      `} from "./${resourceName}Api";`,
    ]
    if (ts) {
      lines.push(`import type { ${typeName} } from "./${resourceName}Schema";`)
    }
    lines.push(
      ``,
      `export const ${keysVar} = {`,
      ts
        ? `  all: [${JSON.stringify(resourceName)}] as const,`
        : `  all: [${JSON.stringify(resourceName)}],`,
      `};`,
      ``,
      `export function use${typeName}Query() {`,
      `  return useQuery({`,
      `    queryKey: ${keysVar}.all,`,
      `    queryFn: () => get${typeName}(),`,
      `  });`,
      `}`,
      ``,
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
      `export function useUpdate${typeName}Mutation() {`,
      `  const queryClient = useQueryClient();`,
      `  return useMutation({`,
      ts
        ? `    mutationFn: (payload: ${typeName}) => update${typeName}(payload),`
        : `    mutationFn: (payload) => update${typeName}(payload),`,
      `    onSuccess: () => {`,
      `      queryClient.invalidateQueries({ queryKey: ${keysVar}.all });`,
      `    },`,
      `  });`,
      `}`,
      ``,
      `export function usePatch${typeName}Mutation() {`,
      `  const queryClient = useQueryClient();`,
      `  return useMutation({`,
      ts
        ? `    mutationFn: (payload: Partial<${typeName}>) => patch${typeName}(payload),`
        : `    mutationFn: (payload) => patch${typeName}(payload),`,
      `    onSuccess: () => {`,
      `      queryClient.invalidateQueries({ queryKey: ${keysVar}.all });`,
      `    },`,
      `  });`,
      `}`,
      ``,
      `export function useDelete${typeName}Mutation() {`,
      `  const queryClient = useQueryClient();`,
      `  return useMutation({`,
      `    mutationFn: () => delete${typeName}(),`,
      `    onSuccess: () => {`,
      `      queryClient.invalidateQueries({ queryKey: ${keysVar}.all });`,
      `    },`,
      `  });`,
      `}`
    )
    return lines.join("\n")
  }

  const sig = listSignature(ctx, lang)

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
    if (sig.hasQuery) {
      lines.push(`import type { ${typeName}ListQuery } from "./${resourceName}Api";`)
    }
  }

  lines.push(
    ``,
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

  // queryKey는 인자 조합에 따라 달라진다. 기존 4분기의 문자열을 그대로 보존한다.
  const queryKeyLine = (): string => {
    if (sig.hasQuery && sig.hasPaging) {
      return ts
        ? `    queryKey: [...${keysVar}.all, query, { page, limit }] as const,`
        : `    queryKey: [...${keysVar}.all, query, { page, limit }],`
    }
    if (sig.hasQuery) {
      return ts
        ? `    queryKey: [...${keysVar}.all, query] as const,`
        : `    queryKey: [...${keysVar}.all, query],`
    }
    if (sig.hasPaging) {
      return ts
        ? `    queryKey: [...${keysVar}.all, { page, limit }] as const,`
        : `    queryKey: [...${keysVar}.all, { page, limit }],`
    }
    return `    queryKey: ${keysVar}.all,`
  }

  lines.push(
    `export function use${typeName}ListQuery(${sig.params}) {`,
    `  return useQuery({`,
    queryKeyLine(),
    `    queryFn: () => get${typeName}List(${sig.callArgs}),`,
    `  });`,
    `}`,
    ``
  )

  lines.push(
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
