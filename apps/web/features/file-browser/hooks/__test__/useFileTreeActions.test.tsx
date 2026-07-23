import { renderHook, act } from "@testing-library/react"
import { useFileTreeActions } from "../useFileTreeActions"
import { FileItem } from "../../types"

const mockCreateItem = jest.fn()
const mockRenameItem = jest.fn()
const mockMoveItems = jest.fn()
const mockDeleteItems = jest.fn()

jest.mock("../../api/createBrowserItem", () => ({
  useCreateBrowserItem: () => ({ mutate: mockCreateItem }),
}))
jest.mock("../../api/renameBrowserItem", () => ({
  useRenameBrowserItem: () => ({ mutate: mockRenameItem }),
}))
jest.mock("../../api/moveBrowserItems", () => ({
  useMoveBrowserItems: () => ({ mutate: mockMoveItems }),
}))
jest.mock("../../api/deleteBrowserItems", () => ({
  useDeleteBrowserItems: () => ({ mutate: mockDeleteItems }),
}))

describe("useFileTreeActions 훅", () => {
  const workspaceId = "test-workspace"
  const onCreateMockApi = jest.fn()
  const setTempNode = jest.fn()
  const flatItems: FileItem[] = [
    { id: "parent-1", name: "folder-1", itemType: "Folder", parentId: null, path: "/folder-1" },
    { id: "file-1", name: "file-1.json", itemType: "File", parentId: "parent-1", path: "/folder-1/file-1.json" },
  ]

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe("onCreate", () => {
    it("type이 leaf일 때 onCreateMockApi가 parentId 및 상위 아이템의 path와 함께 호출되고 null을 반환해야 한다", () => {
      const { result } = renderHook(() =>
        useFileTreeActions({
          workspaceId,
          flatItems,
          tempNode: null,
          setTempNode,
          canMove: true,
          onCreateMockApi,
        })
      )

      let returnedValue
      act(() => {
        returnedValue = result.current.onCreate({ parentId: "parent-1", type: "leaf" } as any)
      })

      expect(onCreateMockApi).toHaveBeenCalledWith("parent-1", "/folder-1")
      expect(returnedValue).toBeNull()
    })

    it("parentId가 null이거나 flatItems에 없을 때 onCreateMockApi가 root path와 함께 호출되어야 한다", () => {
      const { result } = renderHook(() =>
        useFileTreeActions({
          workspaceId,
          flatItems,
          tempNode: null,
          setTempNode,
          canMove: true,
          onCreateMockApi,
        })
      )

      let returnedValue
      act(() => {
        returnedValue = result.current.onCreate({ parentId: null, type: "leaf" } as any)
      })

      expect(onCreateMockApi).toHaveBeenCalledWith(null, "/")
      expect(returnedValue).toBeNull()

      act(() => {
        result.current.onCreate({ parentId: "non-existent", type: "leaf" } as any)
      })
      expect(onCreateMockApi).toHaveBeenLastCalledWith("non-existent", "/")
    })

    it("type이 leaf가 아닐 때 setTempNode로 새로운 임시 폴더 노드를 설정하고 생성된 임시 노드 객체를 반환해야 한다", () => {
      const mockTime = 1700000000000
      const dateSpy = jest.spyOn(Date, "now").mockReturnValue(mockTime)

      try {
        const { result } = renderHook(() =>
          useFileTreeActions({
            workspaceId,
            flatItems,
            tempNode: null,
            setTempNode,
            canMove: true,
            onCreateMockApi,
          })
        )

        let returnedValue
        act(() => {
          returnedValue = result.current.onCreate({ parentId: "parent-1", type: "internal" } as any)
        })

        const expectedTempNode: FileItem = {
          id: `temp-${mockTime}`,
          name: "",
          itemType: "Folder",
          parentId: "parent-1",
        }

        expect(setTempNode).toHaveBeenCalledWith(expectedTempNode)
        expect(returnedValue).toEqual(expectedTempNode)
      } finally {
        dateSpy.mockRestore()
      }
    })
  })

  describe("onRename", () => {
    it("ID가 temp-로 시작하고 tempNode가 매칭될 때 createItem mutation이 호출되어 새 아이템이 생성되어야 하며 setTempNode(null)이 호출되어야 한다", () => {
      const tempNode: FileItem = {
        id: "temp-123",
        name: "",
        itemType: "Folder",
        parentId: "parent-1",
      }

      const { result } = renderHook(() =>
        useFileTreeActions({
          workspaceId,
          flatItems,
          tempNode,
          setTempNode,
          canMove: true,
          onCreateMockApi,
        })
      )

      act(() => {
        result.current.onRename({ id: "temp-123", name: "New Folder" } as any)
      })

      expect(mockCreateItem).toHaveBeenCalledWith({
        name: "New Folder",
        itemType: "Folder",
        parentId: "parent-1",
      })
      expect(setTempNode).toHaveBeenCalledWith(null)
    })

    it("ID가 temp-로 시작하지만 tempNode가 매칭되지 않을 때 createItem을 호출하지 않고 setTempNode를 null로 호출해야 한다", () => {
      const tempNode: FileItem = {
        id: "temp-other",
        name: "",
        itemType: "Folder",
        parentId: null,
      }

      const { result } = renderHook(() =>
        useFileTreeActions({
          workspaceId,
          flatItems,
          tempNode,
          setTempNode,
          canMove: true,
          onCreateMockApi,
        })
      )

      act(() => {
        result.current.onRename({ id: "temp-123", name: "New Folder" } as any)
      })

      expect(mockCreateItem).not.toHaveBeenCalled()
      expect(setTempNode).toHaveBeenCalledWith(null)
    })

    it("ID가 temp-로 시작하지 않을 때 renameItem mutation이 호출되어 아이템 이름이 변경되어야 한다", () => {
      const { result } = renderHook(() =>
        useFileTreeActions({
          workspaceId,
          flatItems,
          tempNode: null,
          setTempNode,
          canMove: true,
          onCreateMockApi,
        })
      )

      act(() => {
        result.current.onRename({ id: "file-1", name: "renamed-file.json" } as any)
      })

      expect(mockRenameItem).toHaveBeenCalledWith({
        itemId: "file-1",
        newName: "renamed-file.json",
      })
      expect(setTempNode).not.toHaveBeenCalled()
    })
  })

  describe("onMove", () => {
    it("canMove가 false일 때 moveItems mutation이 호출되지 않아야 한다", () => {
      const { result } = renderHook(() =>
        useFileTreeActions({
          workspaceId,
          flatItems,
          tempNode: null,
          setTempNode,
          canMove: false,
          onCreateMockApi,
        })
      )

      act(() => {
        result.current.onMove({ dragIds: ["file-1"], parentId: "parent-1" } as any)
      })

      expect(mockMoveItems).not.toHaveBeenCalled()
    })

    it("canMove가 true일 때 moveItems mutation이 dragIds와 parentId 인자와 함께 호출되어야 한다 (parentId가 빈 문자열일 때 null로 대체)", () => {
      const { result } = renderHook(() =>
        useFileTreeActions({
          workspaceId,
          flatItems,
          tempNode: null,
          setTempNode,
          canMove: true,
          onCreateMockApi,
        })
      )

      act(() => {
        result.current.onMove({ dragIds: ["file-1"], parentId: "parent-1" } as any)
      })
      expect(mockMoveItems).toHaveBeenCalledWith({
        dragIds: ["file-1"],
        parentId: "parent-1",
      })

      act(() => {
        result.current.onMove({ dragIds: ["file-1"], parentId: "" } as any)
      })
      expect(mockMoveItems).toHaveBeenLastCalledWith({
        dragIds: ["file-1"],
        parentId: null,
      })
    })
  })

  describe("onDelete", () => {
    it("deleteItems mutation이 ids 배열 인자와 함께 호출되어야 한다", () => {
      const { result } = renderHook(() =>
        useFileTreeActions({
          workspaceId,
          flatItems,
          tempNode: null,
          setTempNode,
          canMove: true,
          onCreateMockApi,
        })
      )

      act(() => {
        result.current.onDelete({ ids: ["file-1", "parent-1"] } as any)
      })

      expect(mockDeleteItems).toHaveBeenCalledWith(["file-1", "parent-1"])
    })
  })
})
