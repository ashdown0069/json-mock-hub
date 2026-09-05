import type { FileItem, FileTree } from "../types"

/**
 * flat → tree 변환
 *
 * DB에서 가져온 플랫 배열(parentId 기반)을
 * react-arborist가 요구하는 중첩 트리 구조로 변환한다.
 *
 * @description
 * 시간복잡도 O(n) — Map을 이용한 단일 순회로 부모-자식 관계를 구축한다.
 * parentId가 null인 노드를 루트로 판별한다.
 *
 * @example
 * ```ts
 * const flat = [
 *   { id: "1", name: "users", itemType: "Folder", parentId: null },
 *   { id: "2", name: "GET /users", itemType: "File", parentId: "1" },
 * ]
 * const tree = buildTree(flat)
 * // => [{ id: "1", name: "users", itemType: "Folder", children: [
 * //      { id: "2", name: "GET /users", itemType: "File" }
 * //    ]}]
 * ```
 */
/**
 * 트리 노드 정렬 비교 함수
 *
 * @description
 * 1순위: 임시 노드 (tempNodeId 일치 또는 id가 'temp-'로 시작) -> 항상 최상단(-1)
 * 2순위: 폴더 우선 (Folder first) -> 폴더가 파일보다 항상 앞(-1)
 * 3순위: 이름 오름차순 (대소문자 무시, 숫자 자연 정렬)
 */
export function compareTreeNodes(
  a: FileTree,
  b: FileTree,
  tempNodeId?: string | null
): number {
  if (tempNodeId) {
    if (a.id === tempNodeId && b.id !== tempNodeId) return -1
    if (b.id === tempNodeId && a.id !== tempNodeId) return 1
  }

  const aIsTemp = a.id.startsWith("temp-")
  const bIsTemp = b.id.startsWith("temp-")
  if (aIsTemp && !bIsTemp) return -1
  if (bIsTemp && !aIsTemp) return 1

  if (a.itemType !== b.itemType) {
    return a.itemType === "Folder" ? -1 : 1
  }

  return a.name.localeCompare(b.name, undefined, {
    numeric: true,
    sensitivity: "base",
  })
}

function sortTreeNodes(nodes: FileTree[], tempNodeId?: string | null): FileTree[] {
  nodes.sort((a, b) => compareTreeNodes(a, b, tempNodeId))
  for (const node of nodes) {
    if (node.children && node.children.length > 0) {
      sortTreeNodes(node.children, tempNodeId)
    }
  }
  return nodes
}

export function buildTree(
  flatItems: FileItem[],
  tempNodeId?: string | null
): FileTree[] {
  const map = new Map<string, FileTree>()
  const roots: FileTree[] = []

  for (const item of flatItems) {
    map.set(item.id, { ...item })
  }

  for (const item of flatItems) {
    const treeNode = map.get(item.id)!

    if (item.parentId == null) {
      roots.push(treeNode)
    } else {
      const parent = map.get(item.parentId)
      if (parent) {
        if (!parent.children) {
          parent.children = []
        }
        parent.children.push(treeNode)
      } else {
        // 부모를 찾지 못한 노드는 유실시키지 않고 루트로 노출한다
        if (process.env.NODE_ENV === "development") {
          console.warn(
            `[buildTree] orphan node: ${treeNode.id} (parentId=${item.parentId})`
          )
        }
        roots.push(treeNode)
      }
    }
  }

  return sortTreeNodes(roots, tempNodeId)
}
