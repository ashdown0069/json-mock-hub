import { formatApiError, type ToolResult } from "./tool-result"

/**
 * 도구 핸들러를 감싸 API 예외를 tool error로 변환한다.
 *
 * try/catch가 10개 핸들러에 반복돼 있었고, 하나라도 빠뜨리면 ApiError가
 * MCP 프로토콜 에러로 올라가 LLM이 자가 수정할 수 없게 된다. 등록 계층에서
 * 한 번 감싸면 새 도구를 추가할 때 잊을 여지가 없다.
 *
 * fn을 화살표로 받아 동기 throw도 함께 잡는다 — Promise를 인자로 받으면
 * 호출 시점의 동기 예외가 이 함수 밖에서 터진다.
 */
export async function withApiErrors<T extends ToolResult>(
  fn: () => Promise<T> | T
): Promise<T | ToolResult> {
  try {
    return await fn()
  } catch (error) {
    return formatApiError(error)
  }
}
