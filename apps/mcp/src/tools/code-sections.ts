import type { CodeGenContext } from "@workspace/codegen/types"
import { schemaToTsInterface } from "@workspace/codegen/schemaToType"
import { buildClientSnippet } from "@workspace/codegen/clientSnippets"
import { buildQuerySnippet } from "@workspace/codegen/querySnippets"
import { buildValidationSnippet } from "@workspace/codegen/validationSnippets"
import type { CodeOptions } from "./code-options"

/**
 * 정해진 옵션으로 코드 섹션을 조립한다.
 *
 * "무엇을 생성할지 정하는 협상"(code-options.ts)과 분리한다 —
 * 새 클라이언트 추가는 협상 쪽, 섹션 순서 변경은 이쪽이 바뀐다.
 */
export function buildCodeSections(
  ctx: CodeGenContext,
  options: CodeOptions
): string {
  const { lang, clientMode, validation } = options
  const fence = lang === "ts" ? "typescript" : "javascript"
  const httpClient = clientMode.startsWith("axios") ? "axios" : "fetch"
  const includeQuery = clientMode.endsWith("+query")

  const sections: string[] = [
    "아래는 참고용 완제품 코드입니다. 사용자가 요청한 부분만 발췌·각색해서 제시하세요.",
  ]
  // TS 타입 선언은 lang이 ts일 때만 포함
  if (lang === "ts") {
    sections.push("", "## 타입", "```" + fence, schemaToTsInterface(ctx.schema, ctx.typeName), "```")
  }
  sections.push(
    "",
    `## HTTP 클라이언트 (${httpClient})`,
    "```" + fence,
    buildClientSnippet(ctx, httpClient, lang),
    "```"
  )
  if (includeQuery) {
    sections.push("", "## react-query 훅", "```" + fence, buildQuerySnippet(ctx, lang), "```")
  }
  if (validation !== "none") {
    sections.push(
      "",
      `## 검증 스키마 (${validation})`,
      "```" + fence,
      buildValidationSnippet(ctx, validation, lang),
      "```"
    )
  }
  return sections.join("\n")
}
