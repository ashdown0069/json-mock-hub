import { resolveMockApiParams } from "@workspace/types"
import type { FileBrowserItemRes } from "./api-client"
import { normalizePath } from "./resolvePath"

// 들여쓰기로 경로를 재구성하다 한 단계만 어긋나도 삭제·갱신이 엉뚱한 항목에 간다.
// 다른 도구가 받는 값과 정확히 같은 문자열을 각 줄에 직접 찍는다.
const ROOT_HINT = "(각 줄 괄호 안의 경로를 다른 도구의 path 인자에 그대로 넣으세요)"

/** 켜져 있는 기능만 짧게 표시한다. 꺼진 기능까지 나열하면 트리가 읽기 어려워진다. */
function optionBadge(item: FileBrowserItemRes): string {
  const params = resolveMockApiParams(item.options)
  const enabled: string[] = []
  if (params.pagination) enabled.push("page")
  if (params.sort) enabled.push("sort")
  if (params.search) enabled.push("search")
  return enabled.length > 0 ? ` [${enabled.join(",")}]` : ""
}

function sortItems(items: FileBrowserItemRes[]): FileBrowserItemRes[] {
  return [...items].sort((a, b) => {
    if (a.itemType !== b.itemType) return a.itemType === "Folder" ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

function renderChildren(
  items: FileBrowserItemRes[],
  childrenByParent: Map<string | null, FileBrowserItemRes[]>,
  prefix: string,
  lines: string[]
): void {
  items.forEach((item, index) => {
    const isLast = index === items.length - 1
    const connector = isLast ? "└── " : "├── "
    const icon = item.itemType === "Folder" ? "📁" : "📄"
    const badge = item.itemType === "File" ? optionBadge(item) : ""
    lines.push(
      `${prefix}${connector}${icon} ${item.name}  (${normalizePath(item.path)})${badge}`
    )

    const children = childrenByParent.get(item.id)
    if (children) {
      const childPrefix = prefix + (isLast ? "    " : "│   ")
      renderChildren(sortItems(children), childrenByParent, childPrefix, lines)
    }
  })
}

/** 평면 목록(parentId 기반)을 이모지 트리 텍스트로 렌더링한다. 빈 배열 안내 메시지는 호출부(list-mock-apis.ts) 책임이다. */
export function buildTreeText(items: FileBrowserItemRes[]): string {
  const childrenByParent = new Map<string | null, FileBrowserItemRes[]>()
  for (const item of items) {
    const siblings = childrenByParent.get(item.parentId) ?? []
    siblings.push(item)
    childrenByParent.set(item.parentId, siblings)
  }

  const lines = ["📁 /", ROOT_HINT]
  const roots = sortItems(childrenByParent.get(null) ?? [])
  renderChildren(roots, childrenByParent, "", lines)
  return lines.join("\n")
}
