import type { FileBrowserItemRes } from "./api-client"

/**
 * 경로 문자열을 정규화합니다.
 * - 연속 슬래시를 하나로 합치고, 앞뒤 공백과 뒤쪽 슬래시 제거
 * - 빈 문자열이나 "/"는 루트("/")로 취급
 * - 앞에 "/"가 없으면 붙임
 */
export function normalizePath(path: string): string {
  // 연속 슬래시를 하나로 합치고, 앞뒤 공백과 뒤쪽 슬래시를 제거한다
  const collapsed = path.trim().replace(/\/{2,}/g, "/").replace(/\/+$/, "")
  if (collapsed === "" || collapsed === "/") return "/"
  return collapsed.startsWith("/") ? collapsed : `/${collapsed}`
}

/**
 * 대소문자만 다른 후보가 둘 이상일 때 던진다.
 *
 * 조용히 하나를 고르면 삭제·갱신이 엉뚱한 항목에 적용된다. API의 중복 검사와
 * unique 인덱스가 대소문자를 구분하므로 /products와 /Products는 실제로
 * 공존할 수 있다 — 그 상태에서 임의 선택은 되돌릴 수 없는 데이터 손실이 된다.
 */
export class AmbiguousPathError extends Error {
  constructor(
    readonly requestedPath: string,
    readonly candidates: string[]
  ) {
    super(
      `"${requestedPath}"와 대소문자만 다른 항목이 ${candidates.length}개 있습니다: ${candidates.join(", ")}`
    )
    this.name = "AmbiguousPathError"
  }
}

/**
 * 경로로 항목을 찾습니다. 일치하는 항목이 없으면 null.
 *
 * 정확 일치를 먼저 보고, 없을 때만 대소문자를 무시한 후보를 찾습니다.
 * LLM이 케이싱을 일관되게 다루지 않으므로 무시 자체는 유지하되,
 * 어느 쪽인지 확정할 수 없으면 추측하지 않고 AmbiguousPathError를 던집니다.
 */
export function findItemByPath(
  items: FileBrowserItemRes[],
  path: string
): FileBrowserItemRes | null {
  const target = normalizePath(path)

  const exact = items.find((item) => normalizePath(item.path) === target)
  if (exact) return exact

  const lowered = target.toLowerCase()
  const loose = items.filter(
    (item) => normalizePath(item.path).toLowerCase() === lowered
  )
  if (loose.length > 1) {
    throw new AmbiguousPathError(
      target,
      loose.map((item) => normalizePath(item.path))
    )
  }
  return loose[0] ?? null
}
