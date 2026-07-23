/**
 * fetch Response의 Set-Cookie 라인 배열에서 대상 이름의 쿠키 값을 추출한다.
 * (SSR에서 /auth/refresh 응답으로 받은 새 토큰을 in-memory로 쓰기 위한 용도)
 */
export function parseSetCookieValue(
  setCookieLines: string[],
  name: string
): string | null {
  for (const line of setCookieLines) {
    const pair = line.split(";")[0] ?? ""
    const eq = pair.indexOf("=")
    if (eq <= 0) continue

    if (pair.slice(0, eq).trim() !== name) continue

    const rawValue = pair.slice(eq + 1).trim()
    if (!rawValue) continue

    try {
      return decodeURIComponent(rawValue)
    } catch {
      return rawValue
    }
  }
  return null
}
