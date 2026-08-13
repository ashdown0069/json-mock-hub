import { renderHook } from "@testing-library/react"
import { useSelectedFile } from "../useSelectedFile"
import { useGetBrowserItems } from "@/features/file-browser/api/getBrowserItems"
import { useFileBrowser } from "@/features/file-browser/store/useFileBrowser"

jest.mock("@/hooks/useWorkspaceBasePath", () => ({
  useWorkspaceBasePath: () => ({ workspaceId: "ws1" }),
}))
jest.mock("@/features/file-browser/api/getBrowserItems", () => ({
  useGetBrowserItems: jest.fn(),
}))
jest.mock("@/features/file-browser/store/useFileBrowser", () => ({
  useFileBrowser: jest.fn(),
}))

const mockedUseGetBrowserItems = useGetBrowserItems as jest.Mock
const mockedUseFileBrowser = useFileBrowser as unknown as jest.Mock

describe("useSelectedFile", () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it("activeItem과 id가 일치하는 File 타입 아이템을 반환한다", () => {
    mockedUseGetBrowserItems.mockReturnValue({
      data: [
        { id: "folder-1", name: "folder", itemType: "Folder" },
        { id: "file-1", name: "users.json", itemType: "File" },
      ],
    })
    mockedUseFileBrowser.mockImplementation((selector: any) =>
      selector({ activeItem: "file-1" }),
    )

    const { result } = renderHook(() => useSelectedFile())

    expect(result.current.item?.id).toBe("file-1")
    expect(result.current.workspaceId).toBe("ws1")
  })

  it("activeItem이 Folder를 가리키면 item은 undefined다", () => {
    mockedUseGetBrowserItems.mockReturnValue({
      data: [{ id: "folder-1", name: "folder", itemType: "Folder" }],
    })
    mockedUseFileBrowser.mockImplementation((selector: any) =>
      selector({ activeItem: "folder-1" }),
    )

    const { result } = renderHook(() => useSelectedFile())

    expect(result.current.item).toBeUndefined()
  })

  it("items가 아직 로드되지 않았으면 item은 undefined다", () => {
    mockedUseGetBrowserItems.mockReturnValue({ data: undefined })
    mockedUseFileBrowser.mockImplementation((selector: any) =>
      selector({ activeItem: "" }),
    )

    const { result } = renderHook(() => useSelectedFile())

    expect(result.current.item).toBeUndefined()
    expect(result.current.workspaceId).toBe("ws1")
  })
})
