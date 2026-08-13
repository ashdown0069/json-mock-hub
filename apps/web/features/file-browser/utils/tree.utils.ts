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
export function buildTree(flatItems: FileItem[]): FileTree[] {
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
  console.log("roots build tree", roots)
  return roots
}
