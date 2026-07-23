import { ApiError } from "./api-client"

// MCP 도구 핸들러의 공용 반환 타입 — toolText/toolError 어느 쪽이 와도 호출부에서
// isError 유무와 무관하게 하나의 타입으로 다룰 수 있도록 한다
export interface ToolResult {
  // SDK의 CallToolResult가 요구하는 인덱스 시그니처(추가 메타 필드 허용)와 구조적으로 맞춘다
  [key: string]: unknown
  content: { type: "text"; text: string }[]
  isError?: true
}

// MCP 도구 결과 헬퍼 — 프로토콜 에러 대신 tool error로 반환해 Claude가 읽고 자가 수정할 수 있게 한다
export function toolText(text: string): ToolResult {
  return { content: [{ type: "text" as const, text }] }
}

export function toolError(text: string): ToolResult {
  return { isError: true as const, content: [{ type: "text" as const, text }] }
}

export function formatApiError(error: unknown): ToolResult {
  if (error instanceof ApiError) {
    const hint =
      error.status === 400 && error.message.includes("이름")
        ? "\n힌트: 같은 폴더에 동일한 이름이 이미 있을 수 있습니다. 다른 이름을 시도하세요."
        : ""
    return toolError(`[${error.status}] ${error.code ?? "error"}: ${error.message}${hint}`)
  }
  return toolError(
    `알 수 없는 오류: ${error instanceof Error ? error.message : String(error)}`
  )
}
