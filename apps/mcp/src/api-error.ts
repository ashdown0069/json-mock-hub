export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string | null,
    message: string
  ) {
    super(message)
    this.name = "ApiError"
  }
}

const pickString = (value: unknown): string | null =>
  typeof value === "string" ? value : null

/**
 * apps/api가 실제로 만드는 에러 바디를 파싱한다.
 *
 * - 전역 예외 필터:  { statusCode, code, message, details? }
 * - ValidationPipe:  { statusCode, message: string[], error }   (필터 도입 전 응답 호환)
 * - 서비스 중복 이름: { message, key: "duplicate" }
 * - 문자열 예외:     { statusCode, message: "Item not found" }
 *
 * 이전 구현은 어디서도 만들어지지 않는 { message: { code, message } }를 가정해
 * code가 항상 null이었고, 배열 메시지는 "HTTP 400"으로 전멸했다.
 */
export function parseErrorBody(
  status: number,
  body: Record<string, unknown> | null
): { code: string | null; message: string } {
  if (!body) return { code: null, message: `HTTP ${status}` }

  const raw = body.message
  const nested = (typeof raw === "object" && raw !== null ? raw : null) as
    | Record<string, unknown>
    | null

  const message = Array.isArray(raw)
    ? raw.map(String).join(" / ")
    : pickString(raw) ?? pickString(nested?.message) ?? `HTTP ${status}`

  const code =
    pickString(body.code) ?? pickString(body.key) ?? pickString(nested?.code)

  // LLM 컨텍스트를 지나치게 소모하지 않도록 상한을 둔다
  return { code, message: message.slice(0, 500) }
}
