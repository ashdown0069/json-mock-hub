import React from "react"
import { renderHook, waitFor, act } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { axiosInstance } from "@/lib/axios"
import { useCreateBrowserItem } from "../createBrowserItem"
import { useRenameBrowserItem } from "../renameBrowserItem"
import { useMoveBrowserItems } from "../moveBrowserItems"
import { useDeleteBrowserItems } from "../deleteBrowserItems"
import { useUpdateBrowserItem } from "../updateBrowserItem"

jest.mock("@/lib/axios", () => {
  const instance = {
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    put: jest.fn(),
  }
  return { __esModule: true, default: instance, axiosInstance: instance }
})

const mockedAxiosInstance = axiosInstance as jest.Mocked<typeof axiosInstance>

describe("브라우저 API 뮤테이션 훅 테스트", () => {
  let queryClient: QueryClient
  let invalidateSpy: jest.SpyInstance

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    invalidateSpy = jest.spyOn(queryClient, "invalidateQueries")
  })

  afterEach(() => {
    jest.clearAllMocks()
    jest.restoreAllMocks()
  })

  describe("useCreateBrowserItem", () => {
    it("성공 시 아이템 생성 API를 호출하고 브라우저 쿼리를 무효화해야 한다", async () => {
      const payload = {
        name: "New Folder",
        itemType: "Folder" as const,
        parentId: null,
      }
      const mockResponse = {
        id: "folder-1",
        name: "New Folder",
        itemType: "Folder",
        parentId: null,
      }
      mockedAxiosInstance.post.mockResolvedValueOnce({ data: mockResponse })

      const { result } = renderHook(() => useCreateBrowserItem("ws-test"), {
        wrapper,
      })

      act(() => {
        result.current.mutate(payload)
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockedAxiosInstance.post).toHaveBeenCalledWith(
        "/ws-test/filebrowser/createItem",
        payload
      )
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["workspaces", "ws-test", "browser"],
      })
    })

    it("실패 시 API 에러가 발생하면 에러 상태로 전이되어야 한다", async () => {
      const payload = {
        name: "New Folder",
        itemType: "Folder" as const,
        parentId: null,
      }
      const mockAxiosError = {
        isAxiosError: true,
        response: {
          status: 400,
          data: { message: "잘못된 생성 요청입니다." },
        },
      }
      mockedAxiosInstance.post.mockRejectedValueOnce(mockAxiosError)

      const { result } = renderHook(() => useCreateBrowserItem("ws-test"), {
        wrapper,
      })

      act(() => {
        result.current.mutate(payload)
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBeDefined()
      expect((result.current.error as any).response?.status).toBe(400)
    })
  })

  describe("useRenameBrowserItem", () => {
    it("성공 시 아이템 이름 변경 API를 호출하고 브라우저 쿼리를 무효화해야 한다", async () => {
      const payload = {
        itemId: "item-1",
        newName: "Renamed Folder",
      }
      const mockResponse = {
        id: "item-1",
        name: "Renamed Folder",
        itemType: "Folder",
        parentId: null,
      }
      mockedAxiosInstance.patch.mockResolvedValueOnce({ data: mockResponse })

      const { result } = renderHook(() => useRenameBrowserItem("ws-test"), {
        wrapper,
      })

      act(() => {
        result.current.mutate(payload)
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockedAxiosInstance.patch).toHaveBeenCalledWith(
        "/ws-test/filebrowser/renameItem",
        payload
      )
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["workspaces", "ws-test", "browser"],
      })
    })

    it("실패 시 API 에러가 발생하면 에러 상태로 전이되어야 한다", async () => {
      const payload = {
        itemId: "item-1",
        newName: "Renamed Folder",
      }
      const mockAxiosError = {
        isAxiosError: true,
        response: {
          status: 400,
          data: { message: "잘못된 변경 요청입니다." },
        },
      }
      mockedAxiosInstance.patch.mockRejectedValueOnce(mockAxiosError)

      const { result } = renderHook(() => useRenameBrowserItem("ws-test"), {
        wrapper,
      })

      act(() => {
        result.current.mutate(payload)
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBeDefined()
      expect((result.current.error as any).response?.status).toBe(400)
    })
  })

  describe("useMoveBrowserItems", () => {
    it("성공 시 아이템 이동 API를 호출하고 브라우저 쿼리를 무효화해야 한다", async () => {
      const payload = {
        dragIds: ["item-1", "item-2"],
        parentId: "folder-1",
      }
      const mockResponse = [
        { id: "item-1", name: "File A", itemType: "File", parentId: "folder-1" },
        { id: "item-2", name: "File B", itemType: "File", parentId: "folder-1" },
      ]
      mockedAxiosInstance.patch.mockResolvedValueOnce({ data: mockResponse })

      const { result } = renderHook(() => useMoveBrowserItems("ws-test"), {
        wrapper,
      })

      act(() => {
        result.current.mutate(payload)
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockedAxiosInstance.patch).toHaveBeenCalledWith(
        "/ws-test/filebrowser/moveItems",
        payload
      )
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["workspaces", "ws-test", "browser"],
      })
    })

    it("실패 시 API 에러가 발생하면 에러 상태로 전이되어야 한다", async () => {
      const payload = {
        dragIds: ["item-1", "item-2"],
        parentId: "folder-1",
      }
      const mockAxiosError = {
        isAxiosError: true,
        response: {
          status: 400,
          data: { message: "잘못된 이동 요청입니다." },
        },
      }
      mockedAxiosInstance.patch.mockRejectedValueOnce(mockAxiosError)

      const { result } = renderHook(() => useMoveBrowserItems("ws-test"), {
        wrapper,
      })

      act(() => {
        result.current.mutate(payload)
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBeDefined()
      expect((result.current.error as any).response?.status).toBe(400)
    })
  })

  describe("useDeleteBrowserItems", () => {
    it("성공 시 아이템 삭제 API를 호출하고 브라우저 쿼리를 무효화해야 한다", async () => {
      const payload = ["item-1", "item-2"]
      mockedAxiosInstance.delete.mockResolvedValueOnce({ data: {} })

      const { result } = renderHook(() => useDeleteBrowserItems("ws-test"), {
        wrapper,
      })

      act(() => {
        result.current.mutate(payload)
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockedAxiosInstance.delete).toHaveBeenCalledWith(
        "/ws-test/filebrowser",
        { data: { itemIds: payload } }
      )
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["workspaces", "ws-test", "browser"],
      })
    })

    it("실패 시 API 에러가 발생하면 에러 상태로 전이되어야 한다", async () => {
      const payload = ["item-1", "item-2"]
      const mockAxiosError = {
        isAxiosError: true,
        response: {
          status: 400,
          data: { message: "잘못된 삭제 요청입니다." },
        },
      }
      mockedAxiosInstance.delete.mockRejectedValueOnce(mockAxiosError)

      const { result } = renderHook(() => useDeleteBrowserItems("ws-test"), {
        wrapper,
      })

      act(() => {
        result.current.mutate(payload)
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBeDefined()
      expect((result.current.error as any).response?.status).toBe(400)
    })
  })

  describe("useUpdateBrowserItem", () => {
    it("성공 시 아이템 속성 수정 API를 호출하고 브라우저 쿼리를 무효화해야 한다", async () => {
      const payload = {
        itemId: "item-1",
        name: "Updated Name",
        itemType: "File" as const,
        parentId: null,
      }
      const mockResponse = {
        id: "item-1",
        name: "Updated Name",
        itemType: "File",
        parentId: null,
      }
      mockedAxiosInstance.put.mockResolvedValueOnce({ data: mockResponse })

      const { result } = renderHook(() => useUpdateBrowserItem("ws-test"), {
        wrapper,
      })

      act(() => {
        result.current.mutate(payload)
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockedAxiosInstance.put).toHaveBeenCalledWith(
        "/ws-test/filebrowser",
        payload
      )
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["workspaces", "ws-test", "browser"],
      })
    })

    it("실패 시 API 에러가 발생하면 에러 상태로 전이되어야 한다", async () => {
      const payload = {
        itemId: "item-1",
        name: "Updated Name",
        itemType: "File" as const,
        parentId: null,
      }
      const mockAxiosError = {
        isAxiosError: true,
        response: {
          status: 400,
          data: { message: "잘못된 수정 요청입니다." },
        },
      }
      mockedAxiosInstance.put.mockRejectedValueOnce(mockAxiosError)

      const { result } = renderHook(() => useUpdateBrowserItem("ws-test"), {
        wrapper,
      })

      act(() => {
        result.current.mutate(payload)
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBeDefined()
      expect((result.current.error as any).response?.status).toBe(400)
    })
  })
})
