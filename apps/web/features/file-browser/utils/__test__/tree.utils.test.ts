import { buildTree } from "../tree.utils"
import type { FileItem, FileTree } from "../../types"

describe("tree.utils", () => {
  describe("buildTree", () => {
    it("플랫 배열을 parentId 기반 중첩 트리로 변환한다", () => {
      const flatItems: FileItem[] = [
        { id: "1", name: "Folder 1", itemType: "Folder", parentId: null },
        { id: "2", name: "Folder 2", itemType: "Folder", parentId: "1" },
        { id: "3", name: "File 1", itemType: "File", parentId: "2" },
        { id: "4", name: "File 2", itemType: "File", parentId: "1" },
      ]

      const tree = buildTree(flatItems)

      expect(tree).toHaveLength(1)
      expect(tree[0]?.id).toBe("1")
      expect(tree[0]?.children).toHaveLength(2)
      
      const childFolder = tree[0]?.children?.find(c => c.id === "2")
      const childFile = tree[0]?.children?.find(c => c.id === "4")
      
      expect(childFolder).toBeDefined()
      expect(childFolder?.children).toHaveLength(1)
      expect(childFolder?.children?.[0]?.id).toBe("3")
      
      expect(childFile).toBeDefined()
      expect(childFile?.children).toBeUndefined()
    })

    it("parentId가 null 또는 undefined인 노드를 루트로 처리한다", () => {
      const flatItems: FileItem[] = [
        { id: "1", name: "Folder 1", itemType: "Folder", parentId: null },
        { id: "2", name: "Folder 2", itemType: "Folder", parentId: undefined },
      ]

      const tree = buildTree(flatItems)

      expect(tree).toHaveLength(2)
      expect(tree[0]?.id).toBe("1")
      expect(tree[1]?.id).toBe("2")
    })

    it("존재하지 않는 parentId를 가진 고아 노드는 루트로 승격된다", () => {
      const flatItems: FileItem[] = [
        { id: "1", name: "Folder 1", itemType: "Folder", parentId: null },
        { id: "2", name: "File 1", itemType: "File", parentId: "non-existent" },
      ]

      const tree = buildTree(flatItems)

      // 루트에 2개 노드: 원래 루트 + orphan
      expect(tree).toHaveLength(2)
      expect(tree.find(n => n.id === "1")).toBeDefined()
      expect(tree.find(n => n.id === "2")).toBeDefined()
      expect(tree[0]?.children).toBeUndefined()
    })

    it("빈 배열 입력 시 빈 배열을 반환한다", () => {
      const tree = buildTree([])
      expect(tree).toEqual([])
    })
  })
})
