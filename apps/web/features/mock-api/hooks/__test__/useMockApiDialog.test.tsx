import { renderHook, act } from "@testing-library/react"
import { toast } from "sonner"
import { FileItem } from "@/features/file-browser/types"
import { parentPathOf, useMockApiDialog } from "../useMockApiDialog"

const mockPush = jest.fn()
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))
jest.mock("@/i18n/routing", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

jest.mock("next-intl", () => ({
  useTranslations: () => {
    const t = (key: string) => key
    t.has = () => false
    return t
  },
}))

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

const mockCreateItem = jest.fn()
const mockUpdateItem = jest.fn()
const mockUseCreateBrowserItem = jest.fn((_wsId: string, _options?: any) => ({ mutate: mockCreateItem }))
const mockUseUpdateBrowserItem = jest.fn((_wsId: string, _options?: any) => ({ mutate: mockUpdateItem }))
jest.mock("@/features/file-browser/api/createBrowserItem", () => ({
  useCreateBrowserItem: (wsId: string, options?: any) => mockUseCreateBrowserItem(wsId, options),
}))
jest.mock("@/features/file-browser/api/updateBrowserItem", () => ({
  useUpdateBrowserItem: (wsId: string, options?: any) => mockUseUpdateBrowserItem(wsId, options),
}))

const mockSetActiveItem = jest.fn()
const mockResetCreateForm = jest.fn()
const mockHydrate = jest.fn()
jest.mock("@/features/file-browser/store/useFileBrowser", () => ({
  useFileBrowser: (selector: any) => selector({
    setActiveItem: mockSetActiveItem,
  }),
}))
jest.mock("../../store/useCreateMockApiStore", () => ({
  useCreateMockApiStore: (selector: any) => selector({
    reset: mockResetCreateForm,
    hydrate: mockHydrate,
  }),
}))

const mockBuildHydrationState = jest.fn()
jest.mock("../../lib/hydrateFromItem", () => ({
  buildHydrationState: (item: any) => mockBuildHydrationState(item),
}))

describe("useMockApiDialog 및 parentPathOf 테스트", () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  describe("parentPathOf", () => {
    it("올바른 상위 경로를 반환하거나 기본값으로 루트 경로를 반환해야 한다", () => {
      expect(parentPathOf("/users/list")).toBe("/users")
      expect(parentPathOf("/list")).toBe("/")
      expect(parentPathOf("")).toBe("/")
      expect(parentPathOf(undefined)).toBe("/")
    })
  })

  describe("useMockApiDialog 상태 및 기본 동작", () => {
    it("openCreate를 호출하면 다이얼로그 부모 폴더가 설정되고 isOpen이 true가 되며 올바른 parentPath를 반환해야 한다", () => {
      const { result } = renderHook(() => useMockApiDialog("ws-id", "/workspaces/ws-id"))

      act(() => {
        result.current.openCreate("parent-id", "/parent-path")
      })

      expect(result.current.isOpen).toBe(true)
      expect(result.current.parentPath).toBe("/parent-path")
    })

    it("openEdit를 호출하면 폼을 채우고 editTarget이 설정되며 isOpen이 true가 되고 올바른 parentPath를 반환해야 한다", () => {
      const { result } = renderHook(() => useMockApiDialog("ws-id", "/workspaces/ws-id"))
      const mockItem: FileItem = {
        id: "api-id",
        name: "list",
        itemType: "File",
        path: "/users/list",
        parentId: "parent-id",
      }
      mockBuildHydrationState.mockReturnValue("mocked-hydration-state")

      act(() => {
        result.current.openEdit(mockItem)
      })

      expect(mockBuildHydrationState).toHaveBeenCalledWith(mockItem)
      expect(mockHydrate).toHaveBeenCalledWith("mocked-hydration-state")
      expect(result.current.editTarget).toEqual(mockItem)
      expect(result.current.isOpen).toBe(true)
      expect(result.current.parentPath).toBe("/users")
    })

    it("close를 호출하면 다이얼로그 부모 폴더 및 editTarget이 null로 초기화되어 isOpen이 false가 되어야 한다", () => {
      const { result } = renderHook(() => useMockApiDialog("ws-id", "/workspaces/ws-id"))

      act(() => {
        result.current.openCreate("parent-id", "/parent-path")
      })
      expect(result.current.isOpen).toBe(true)

      act(() => {
        result.current.close()
      })
      expect(result.current.isOpen).toBe(false)
      expect(result.current.editTarget).toBeNull()

      const mockItem: FileItem = {
        id: "api-id",
        name: "list",
        itemType: "File",
        path: "/users/list",
        parentId: "parent-id",
      }

      act(() => {
        result.current.openEdit(mockItem)
      })
      expect(result.current.isOpen).toBe(true)

      act(() => {
        result.current.close()
      })
      expect(result.current.isOpen).toBe(false)
      expect(result.current.editTarget).toBeNull()
    })
  })

  describe("onSubmit (생성 모드)", () => {
    it("생성 모드에서 onSubmit 호출 시 createItem mutation이 올바른 payload 및 parentId와 함께 호출되어야 한다", () => {
      const { result } = renderHook(() => useMockApiDialog("ws-id", "/workspaces/ws-id"))

      act(() => {
        result.current.openCreate("parent-id", "/parent-path")
      })

      const payload = {
        name: "new-api",
        schema: {},
      } as any

      act(() => {
        result.current.onSubmit(payload)
      })

      expect(mockCreateItem).toHaveBeenCalledWith(
        expect.objectContaining({
          ...payload,
          itemType: "File",
          parentId: "parent-id",
        }),
        expect.any(Object)
      )
    })

    it("생성 성공 시 setActiveItem 호출, 성공 토스트 표시, 다이얼로그 닫기, 폼 리셋, 그리고 apis 경로로 push가 호출되어야 한다", () => {
      const { result } = renderHook(() => useMockApiDialog("ws-id", "/workspaces/ws-id"))

      act(() => {
        result.current.openCreate("parent-id", "/parent-path")
      })

      const payload = {
        name: "new-api",
        schema: {},
      } as any

      act(() => {
        result.current.onSubmit(payload)
      })

      const [, options] = mockCreateItem.mock.calls[0]
      const createdItem = { _id: "created-api-id", path: "/new-api" }

      act(() => {
        options.onSuccess(createdItem)
      })

      expect(mockSetActiveItem).toHaveBeenCalledWith("created-api-id")
      expect(toast.success).toHaveBeenCalledWith("createSuccess")
      expect(result.current.isOpen).toBe(false)
      expect(mockResetCreateForm).toHaveBeenCalled()
      expect(mockPush).toHaveBeenCalledWith("/workspaces/ws-id/apis")
    })

    it("useCreateBrowserItem 훅에 번역된 defaultMsg 옵션을 전달해야 한다", () => {
      renderHook(() => useMockApiDialog("ws-id", "/workspaces/ws-id"))

      expect(mockUseCreateBrowserItem).toHaveBeenCalledWith("ws-id", {
        defaultMsg: "createFailed",
      })
    })
  })

  describe("onSubmit (수정 모드)", () => {
    it("수정 모드에서 onSubmit 호출 시 updateItem mutation이 올바른 payload 및 editTarget ID와 함께 호출되어야 한다", () => {
      const { result } = renderHook(() => useMockApiDialog("ws-id", "/workspaces/ws-id"))
      const mockItem: FileItem = {
        id: "api-id",
        name: "list",
        itemType: "File",
        path: "/users/list",
        parentId: "parent-id",
      }

      act(() => {
        result.current.openEdit(mockItem)
      })

      const payload = {
        name: "updated-api",
        schema: {},
      } as any

      act(() => {
        result.current.onSubmit(payload)
      })

      expect(mockUpdateItem).toHaveBeenCalledWith(
        expect.objectContaining({
          ...payload,
          itemType: "File",
          parentId: "parent-id",
          itemId: "api-id",
        }),
        expect.any(Object)
      )
    })

    it("수정 성공 시 성공 토스트 표시, editTarget 초기화, 폼 리셋이 호출되어야 한다", () => {
      const { result } = renderHook(() => useMockApiDialog("ws-id", "/workspaces/ws-id"))
      const mockItem: FileItem = {
        id: "api-id",
        name: "list",
        itemType: "File",
        path: "/users/list",
        parentId: "parent-id",
      }

      act(() => {
        result.current.openEdit(mockItem)
      })

      const payload = {
        name: "updated-api",
        schema: {},
      } as any

      act(() => {
        result.current.onSubmit(payload)
      })

      const [, options] = mockUpdateItem.mock.calls[0]

      act(() => {
        options.onSuccess()
      })

      expect(toast.success).toHaveBeenCalledWith("updateSuccess")
      expect(result.current.isOpen).toBe(false)
      expect(result.current.editTarget).toBeNull()
      expect(mockResetCreateForm).toHaveBeenCalled()
    })

    it("useUpdateBrowserItem 훅에 번역된 defaultMsg 옵션을 전달해야 한다", () => {
      renderHook(() => useMockApiDialog("ws-id", "/workspaces/ws-id"))

      expect(mockUseUpdateBrowserItem).toHaveBeenCalledWith("ws-id", {
        defaultMsg: "updateFailed",
      })
    })
  })
})
