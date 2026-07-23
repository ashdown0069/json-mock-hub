"use client"

import { useMemo, useState } from "react"
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { FileItem } from "@/features/file-browser/types"
import { SchemaObject } from "@/types/schema"
import { getMockApiBaseUrl } from "@/lib/mockApiUrl"
import { CodeBlock } from "@/features/mock-api/components/detail/CodeBlock"
import {
  toIdentifier,
  toPascalCase,
  buildValidationSnippet,
  buildClientSnippet,
  buildQuerySnippet,
  type CodeGenContext,
  type CodeLang,
  type HttpClientLib,
  type ValidationLib,
} from "@workspace/codegen"

interface CodeGenPanelProps {
  item: FileItem
  workspaceId: string
}

/**
 * 선택된 Mock API의 저장 스키마를 바탕으로
 * 검증 스키마(zod/yup/joi), HTTP 클라이언트(axios/fetch), TanStack Query 훅 코드를 생성해 보여줍니다.
 */
export function CodeGenPanel({ item, workspaceId }: CodeGenPanelProps) {
  const [lang, setLang] = useState<CodeLang>("ts")
  const [validationLib, setValidationLib] = useState<ValidationLib>("zod")
  const [clientLib, setClientLib] = useState<HttpClientLib>("axios")

  const ctx = useMemo<CodeGenContext>(() => {
    const resourceName = toIdentifier(item.name)
    return {
      resourceName,
      typeName: toPascalCase(resourceName),
      baseUrl: getMockApiBaseUrl(workspaceId),
      resourcePath: item.path ?? `/${item.name}`,
      schema: (item.schema ?? {}) as SchemaObject,
      pagination: item.options?.pagination
        ? {
            pageParam: item.options.paginationParams?.pageParam ?? "page",
            limitParam: item.options.paginationParams?.limitParam ?? "limit",
          }
        : null,
    }
  }, [item, workspaceId])

  const shikiLang = lang === "ts" ? "typescript" : "javascript"

  const validationCode = useMemo(
    () => buildValidationSnippet(ctx, validationLib, lang),
    [ctx, validationLib, lang]
  )
  const clientCode = useMemo(
    () => buildClientSnippet(ctx, clientLib, lang),
    [ctx, clientLib, lang]
  )
  const queryCode = useMemo(() => buildQuerySnippet(ctx, lang), [ctx, lang])

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* 언어 선택 */}
      <Tabs value={lang} onValueChange={(v) => setLang(v as CodeLang)}>
        <TabsList className="h-9">
          <TabsTrigger value="ts" className="cursor-pointer">TypeScript</TabsTrigger>
          <TabsTrigger value="js" className="cursor-pointer">JavaScript</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* 검증 스키마 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-sm font-semibold">
            Validation Schema
          </CardTitle>
          <Tabs
            value={validationLib}
            onValueChange={(v) => setValidationLib(v as ValidationLib)}
          >
            <TabsList className="h-9">
              <TabsTrigger value="zod" className="cursor-pointer">zod</TabsTrigger>
              <TabsTrigger value="yup" className="cursor-pointer">yup</TabsTrigger>
              <TabsTrigger value="joi" className="cursor-pointer">joi</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <CodeBlock
            code={validationCode}
            lang={shikiLang}
            className="max-h-96"
          />
        </CardContent>
      </Card>

      {/* HTTP 클라이언트 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-sm font-semibold">API Client</CardTitle>
          <Tabs
            value={clientLib}
            onValueChange={(v) => setClientLib(v as HttpClientLib)}
          >
            <TabsList className="h-9">
              <TabsTrigger value="axios" className="cursor-pointer">axios</TabsTrigger>
              <TabsTrigger value="fetch" className="cursor-pointer">fetch</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <CodeBlock code={clientCode} lang={shikiLang} className="max-h-96" />
        </CardContent>
      </Card>

      {/* TanStack Query */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold">
            TanStack Query Hooks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CodeBlock code={queryCode} lang={shikiLang} className="max-h-96" />
        </CardContent>
      </Card>
    </div>
  )
}
