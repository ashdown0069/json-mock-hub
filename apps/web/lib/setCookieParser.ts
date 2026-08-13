import { parse } from "set-cookie-parser"

/**
 * fetch Response의 Set-Cookie 라인 배열에서 대상 이름의 쿠키 값을 추출한다.
 * (SSR에서 /auth/refresh 응답으로 받은 새 토큰을 in-memory로 쓰기 위한 용도)
 *
 * 값이 빈 문자열인 쿠키는 "없음"으로 취급한다 — 서버가 쿠키를 만료시킬 때
 * 빈 값을 보내므로, 그걸 유효한 토큰으로 오인하면 재시도가 빈 토큰으로 나간다.
 */
export function parseSetCookieValue(
  setCookieLines: string[],
  name: string
): string | null {
  const cookies = parse(setCookieLines, { map: true, decodeValues: true })
  return cookies[name]?.value || null
}
