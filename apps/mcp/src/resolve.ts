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

/** 경로로 항목을 찾습니다. 일치하는 항목이 없으면 null. */
export function findItemByPath(
  items: FileBrowserItemRes[],
  path: string
): FileBrowserItemRes | null {
  const target = normalizePath(path)
  return items.find((item) => normalizePath(item.path) === target) ?? null
}
