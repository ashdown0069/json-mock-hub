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

    it("트리 노드를 폴더 우선(Folder first) 및 이름 오름차순(A-Z)으로 정렬한다", () => {
      const flatItems: FileItem[] = [
        { id: "1", name: "b-file", itemType: "File", parentId: null },
        { id: "2", name: "z-folder", itemType: "Folder", parentId: null },
        { id: "3", name: "a-folder", itemType: "Folder", parentId: null },
        { id: "4", name: "a-file", itemType: "File", parentId: null },
      ]

      const tree = buildTree(flatItems)

      expect(tree.map((n) => n.name)).toEqual([
        "a-folder",
        "z-folder",
        "a-file",
        "b-file",
      ])
    })

    it("임시 노드(tempNodeId 또는 temp- 접두사)는 항상 최상단(index 0)에 위치한다", () => {
      const flatItems: FileItem[] = [
        { id: "1", name: "b-folder", itemType: "Folder", parentId: null },
        { id: "temp-123", name: "", itemType: "Folder", parentId: null },
        { id: "2", name: "a-folder", itemType: "Folder", parentId: null },
      ]

      const tree = buildTree(flatItems, "temp-123")

      expect(tree[0]?.id).toBe("temp-123")
      expect(tree[1]?.name).toBe("a-folder")
      expect(tree[2]?.name).toBe("b-folder")
    })

    it("자식(children) 노드에도 폴더 우선 및 이름 오름차순 정렬이 재귀적으로 적용된다", () => {
      const flatItems: FileItem[] = [
        { id: "p1", name: "parent", itemType: "Folder", parentId: null },
        { id: "c1", name: "file-b", itemType: "File", parentId: "p1" },
        { id: "c2", name: "subfolder-b", itemType: "Folder", parentId: "p1" },
        { id: "c3", name: "subfolder-a", itemType: "Folder", parentId: "p1" },
        { id: "c4", name: "file-a", itemType: "File", parentId: "p1" },
      ]

      const tree = buildTree(flatItems)
      const children = tree[0]?.children ?? []

      expect(children.map((c) => c.name)).toEqual([
        "subfolder-a",
        "subfolder-b",
        "file-a",
        "file-b",
      ])
    })
  })

  describe("buildTree — 빈 폴더", () => {
    it("자식이 없는 폴더는 children을 만들지 않는다 (트리 자료구조의 의미 유지)", () => {
      const [root] = buildTree([
        { id: "1", name: "empty", itemType: "Folder", parentId: null },
      ])

      expect(root?.children).toBeUndefined()
    })

    it("빈 폴더와 형제 파일이 같은 레벨에 유지된다", () => {
      const roots = buildTree([
        { id: "1", name: "empty", itemType: "Folder", parentId: null },
        { id: "2", name: "users", itemType: "File", parentId: null },
      ])

      expect(roots).toHaveLength(2)
      expect(roots.map((r) => r.id)).toEqual(["1", "2"])
    })
  })
})

