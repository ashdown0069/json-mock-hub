import React from "react"
import { renderHook, act } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useFileTreeData } from "../useFileTreeData"
import { useGetBrowserItems } from "../../api/getBrowserItems"
import { useFileBrowserSSE } from "../useFileBrowserSSE"
import { FileItem } from "../../types"

jest.mock("../../api/getBrowserItems", () => ({
  useGetBrowserItems: jest.fn(),
}))
jest.mock("../useFileBrowserSSE", () => ({
  useFileBrowserSSE: jest.fn(),
}))

const mockUseGetBrowserItems = useGetBrowserItems as jest.Mock
const mockUseFileBrowserSSE = useFileBrowserSSE as jest.Mock

describe("useFileTreeData 훅", () => {
  let queryClient: QueryClient

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  beforeEach(() => {
    jest.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })
  })

  it("로딩 중일 때 isLoading이 true이고, treeData 및 flatItems가 빈 배열이어야 한다", () => {
    mockUseGetBrowserItems.mockReturnValue({
      data: undefined,
      isLoading: true,
    })

    const { result } = renderHook(() => useFileTreeData("test-workspace"), {
      wrapper,
    })

    expect(result.current.isLoading).toBe(true)
    expect(result.current.flatItems).toEqual([])
    expect(result.current.treeData).toEqual([])
  })

  it("flatItems가 로드되었을 때 isLoading이 false이고, flatItems 데이터가 채워지며, buildTree 결과가 treeData로 반환되어야 한다", () => {
    const mockFlatItems: FileItem[] = [
      { id: "1", name: "folder1", itemType: "Folder", parentId: null },
      { id: "2", name: "file1", itemType: "File", parentId: "1" },
    ]

    mockUseGetBrowserItems.mockReturnValue({
      data: mockFlatItems,
      isLoading: false,
    })

    const { result } = renderHook(() => useFileTreeData("test-workspace"), {
      wrapper,
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.flatItems).toEqual(mockFlatItems)

    const expectedTree = [
      {
        id: "1",
        name: "folder1",
        itemType: "Folder",
        parentId: null,
        children: [
          { id: "2", name: "file1", itemType: "File", parentId: "1" },
        ],
      },
    ]
    expect(result.current.treeData).toEqual(expectedTree)
  })

  it("tempNode를 세팅했을 때 기존 flatItems와 병합되어 buildTree를 통해 treeData에 반영되어야 한다", () => {
    const mockFlatItems: FileItem[] = [
      { id: "1", name: "folder1", itemType: "Folder", parentId: null },
    ]

    mockUseGetBrowserItems.mockReturnValue({
      data: mockFlatItems,
      isLoading: false,
    })

    const { result } = renderHook(() => useFileTreeData("test-workspace"), {
      wrapper,
    })

    const tempNode: FileItem = {
      id: "2",
      name: "tempFile",
      itemType: "File",
      parentId: "1",
    }

    act(() => {
      result.current.setTempNode(tempNode)
    })

    expect(result.current.tempNode).toEqual(tempNode)

    const expectedTree = [
      {
        id: "1",
        name: "folder1",
        itemType: "Folder",
        parentId: null,
        children: [
          { id: "2", name: "tempFile", itemType: "File", parentId: "1" },
        ],
      },
    ]
    expect(result.current.treeData).toEqual(expectedTree)

    act(() => {
      result.current.setTempNode(null)
    })

    expect(result.current.tempNode).toBeNull()
    expect(result.current.treeData).toEqual([
      {
        id: "1",
        name: "folder1",
        itemType: "Folder",
        parentId: null,
      },
    ])
  })

  it("훅 호출 시 useFileBrowserSSE가 workspaceId와 함께 올바르게 호출되어야 한다", () => {
    mockUseGetBrowserItems.mockReturnValue({
      data: [],
      isLoading: false,
    })

    renderHook(() => useFileTreeData("test-workspace"), {
      wrapper,
    })

    expect(mockUseFileBrowserSSE).toHaveBeenCalledWith("test-workspace")
  })
})
