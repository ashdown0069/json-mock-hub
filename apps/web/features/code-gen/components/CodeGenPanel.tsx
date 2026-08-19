"use client"

import { useMemo, useState } from "react"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import { SchemaObject } from "@workspace/types"
import { getMockApiBaseUrl } from "@/lib/mockApiUrl"
import { CodeBlock } from "@/features/mock-api/components/detail/CodeBlock"
import { CodeGenToolbar } from "./CodeGenToolbar"
import { buildCodeGenContext } from "@workspace/codegen/context"
import {
  buildValidationSnippet,
  buildClientSnippet,
  buildQuerySnippet,
  type CodeGenContext,
  type CodeLang,
  type HttpClientLib,
  type ValidationLib,
} from "@workspace/codegen"
import { useSelectedFile } from "@/features/mock-api/hooks/useSelectedFile"

/** 메인 탭으로 전환되는 코드 섹션 식별자 */
type CodeSection = "validation" | "client" | "query"

const SECTION_TABS: { value: CodeSection; label: string }[] = [
  { value: "validation", label: "Validation Schema" },
  { value: "client", label: "API Client" },
  { value: "query", label: "TanStack Query Hooks" },
]

// 밑줄형(line) 탭. 기본 px-1.5 패딩을 px-4로 넓히고, 비활성 slate-500 → 활성 indigo-700 +
// 하단 인디케이터로 선택 상태를 분명히 한다.
// after:bottom / h 오버라이드는 기본 클래스와 동일한 변형 접두사를 붙여야 실제로 덮인다.
const SECTION_TAB_CLASS =
  "h-full flex-none cursor-pointer px-4 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 after:bg-indigo-600 data-active:font-semibold data-active:text-indigo-700 group-data-horizontal/tabs:after:bottom-[-1px]"

/**
 * 선택된 Mock API의 저장 스키마를 바탕으로
 * 검증 스키마(zod/yup/joi), HTTP 클라이언트(axios/fetch), TanStack Query 훅 코드를 생성해 보여줍니다.
 * 옵션은 상단 툴바에 모으고, 코드는 메인 탭으로 한 번에 하나만 노출합니다.
 */
export function CodeGenPanel() {
  const { item, workspaceId } = useSelectedFile()
  const [section, setSection] = useState<CodeSection>("validation")
  const [lang, setLang] = useState<CodeLang>("ts")
  const [validationLib, setValidationLib] = useState<ValidationLib>("zod")
  const [clientLib, setClientLib] = useState<HttpClientLib>("axios")

  // Rules of Hooks: item이 없어도 훅 호출 순서를 지키기 위해 ctx를 null로 폴백한다.
  const ctx = useMemo<CodeGenContext | null>(
    () =>
      item
        ? buildCodeGenContext(item, { baseUrl: getMockApiBaseUrl(workspaceId) })
        : null,
    [item, workspaceId]
  )

  const shikiLang = lang === "ts" ? "typescript" : "javascript"

  const validationCode = useMemo(
    () => (ctx ? buildValidationSnippet(ctx, validationLib, lang) : ""),
    [ctx, validationLib, lang]
  )
  const clientCode = useMemo(
    () => (ctx ? buildClientSnippet(ctx, clientLib, lang) : ""),
    [ctx, clientLib, lang]
  )
  const queryCode = useMemo(
    () => (ctx ? buildQuerySnippet(ctx, lang) : ""),
    [ctx, lang]
  )

  if (!item || !ctx) return null

  return (
    <div className="flex max-w-4xl flex-col gap-4">
      <CodeGenToolbar
        lang={lang}
        onLangChange={setLang}
        validationLib={validationLib}
        onValidationLibChange={setValidationLib}
        clientLib={clientLib}
        onClientLibChange={setClientLib}
      />

      <Tabs
        value={section}
        onValueChange={(value) => setSection(value as CodeSection)}
      >
        <TabsList
          variant="line"
          className="w-full justify-start gap-1 rounded-none border-b border-slate-200 p-0 group-data-horizontal/tabs:h-10"
        >
          {SECTION_TABS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className={SECTION_TAB_CLASS}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="validation">
          <CodeBlock
            code={validationCode}
            lang={shikiLang}
            className="max-h-140"
          />
        </TabsContent>
        <TabsContent value="client">
          <CodeBlock code={clientCode} lang={shikiLang} className="max-h-140" />
        </TabsContent>
        <TabsContent value="query">
          <CodeBlock code={queryCode} lang={shikiLang} className="max-h-140" />
        </TabsContent>
      </Tabs>
    </div>
  )
}
