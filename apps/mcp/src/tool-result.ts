import { ApiError } from "./api-error"
import { AmbiguousPathError } from "./resolve"

// MCP 도구 핸들러의 공용 반환 타입 — toolText/toolError 어느 쪽이 와도 호출부에서
// isError 유무와 무관하게 하나의 타입으로 다룰 수 있도록 한다
export type ToolResult =
  | { isError?: false; content: { type: "text"; text: string }[] }
  | { isError: true; content: { type: "text"; text: string }[] }

export function toolText(text: string): ToolResult {
  return { content: [{ type: "text" as const, text }] }
}

export function toolError(text: string): ToolResult {
  return { isError: true as const, content: [{ type: "text" as const, text }] }
}

/**
 * 에러 코드별 자가 수정 힌트.
 * 이전에는 message.includes("이름")으로 판정했는데 실제 메시지는 영어
 * "File name already exists"라 가장 흔한 실패에서 힌트가 절대 뜨지 않았다.
 */
const HINT_BY_CODE: Record<string, string> = {
  duplicate:
    "같은 폴더에 동일한 이름이 이미 있습니다. 다른 이름을 시도하세요.",
  "common.duplicate":
    "같은 폴더에 동일한 이름이 이미 있습니다. 다른 이름을 시도하세요.",
  nameConflict:
    "대상 폴더에 동일한 이름의 항목이 이미 있습니다. 다른 대상 폴더를 지정하거나 먼저 이름을 바꾸세요.",
  invalidParent:
    "지정한 부모 폴더가 존재하지 않거나 폴더가 아닙니다. list_mock_apis로 폴더 경로를 확인하거나 create_folder로 먼저 만드세요.",
  "common.validation_failed":
    "요청 형식이 규칙에 맞지 않습니다. 이름은 한글·영문·숫자·하이픈(-)·언더바(_)만 사용할 수 있습니다.",
  "common.invalid_id":
    "경로 또는 식별자가 올바르지 않습니다. list_mock_apis로 현재 경로를 확인하세요.",
  "workspace.permission.denied":
    "이 워크스페이스에서 해당 작업을 수행할 권한이 없습니다. 워크스페이스 소유자에게 문의하세요.",
  "workspace.access.not_member":
    "이 워크스페이스의 멤버가 아닙니다. 워크스페이스 소유자에게 초대를 요청하세요.",
  // 키 검증 쿼리가 workspace 조건을 함께 걸기 때문에, 키가 맞아도 워크스페이스
  // ID가 다르면 같은 코드가 나온다. 키만 지목하면 엉뚱한 값을 고치게 된다.
  "auth.api_key.invalid":
    "MOCK_HUB_API_KEY 또는 MOCK_HUB_WORKSPACE_ID가 올바르지 않습니다. 두 값은 함께 대조되므로 한쪽만 틀려도 같은 오류가 납니다. 대시보드의 MCP 설치 가이드에서 둘 다 다시 복사하세요.",
  "auth.api_key.workspace_mismatch":
    "API 키가 이 워크스페이스의 것이 아닙니다. MOCK_HUB_WORKSPACE_ID와 MOCK_HUB_API_KEY가 같은 워크스페이스의 값인지 확인하세요.",
}

/**
 * code가 없는 실패의 폴백 힌트.
 * 스로틀러 예외는 code를 싣지 않아 HINT_BY_CODE로는 잡히지 않는다.
 */
const HINT_BY_STATUS: Record<number, string> = {
  429: "요청이 너무 잦아 API가 차단했습니다. 차단은 1시간 지속되므로 즉시 재시도하지 마세요. 사용자에게 상황을 알리고, 대량 작업이었다면 나누어 진행하도록 안내하세요.",
}

export function formatApiError(error: unknown): ToolResult {
  // API 호출 전에 MCP가 스스로 판정한 실패다. 후보를 그대로 보여줘야
  // LLM이 정확한 대소문자로 즉시 재호출할 수 있다.
  if (error instanceof AmbiguousPathError) {
    return toolError(
      `${error.message}\n힌트: 위 경로 중 하나를 정확한 대소문자로 다시 지정하세요. list_mock_apis로 현재 경로를 확인할 수 있습니다.`
    )
  }

  if (error instanceof ApiError) {
    const hint =
      (error.code ? HINT_BY_CODE[error.code] : undefined) ??
      HINT_BY_STATUS[error.status]
    const suffix = hint ? `\n힌트: ${hint}` : ""
    return toolError(
      `[${error.status}] ${error.code ?? "error"}: ${error.message}${suffix}`
    )
  }
  return toolError(
    `알 수 없는 오류: ${error instanceof Error ? error.message : String(error)}`
  )
}
