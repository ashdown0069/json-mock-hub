import type { CodeGenContext, CodeLang } from "./types"

/**
 * 목록 함수의 인자 조합.
 *
 * (listQuery × pagination) 2×2 조합이 axios·fetch·query hooks 세 파일에 각각
 * 4갈래로 펼쳐져 있었다. 옵션이 하나 더 붙으면 8분기 × 3파일이 되므로
 * 시그니처 계산을 여기 한 곳으로 모은다.
 *
 * 본문(요청 옵션 객체·queryKey 등)은 파일마다 형태가 달라 각자 만든다 —
 * 여기서 문자열 템플릿까지 흡수하면 세 라이브러리의 관심사가 한 파일에 섞인다.
 */
export interface ListSignature {
  /** 함수 선언의 인자 목록. 인자가 없으면 빈 문자열 */
  params: string
  /** 호출부에 넘길 인자 목록. 인자가 없으면 빈 문자열 */
  callArgs: string
  /** 정렬·검색 중 하나라도 켜지면 목록 쿼리 인자가 생긴다 */
  hasQuery: boolean
  hasPaging: boolean
}

export function listSignature(
  ctx: CodeGenContext,
  lang: CodeLang
): ListSignature {
  const ts = lang === "ts"
  // 정렬·검색 중 하나라도 켜지면 UsersListQuery 인터페이스가 생기고 query 인자를 받는다
  const hasQuery = Boolean(ctx.sort || ctx.search)
  const hasPaging = Boolean(ctx.pagination)

  const params = [
    hasQuery ? (ts ? `query: ${ctx.typeName}ListQuery = {}` : `query = {}`) : null,
    hasPaging ? `page = 1, limit = 10` : null,
  ]
    .filter((part): part is string => part !== null)
    .join(", ")

  const callArgs = [hasQuery ? "query" : null, hasPaging ? "page, limit" : null]
    .filter((part): part is string => part !== null)
    .join(", ")

  return { params, callArgs, hasQuery, hasPaging }
}
