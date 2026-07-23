import React from "react"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import axiosInstance from "@/lib/axios"
import { useMyPermissions } from "../useMyPermissions"

jest.mock("@/lib/axios", () => {
  const instance = { get: jest.fn() }
  return { __esModule: true, default: instance, axiosInstance: instance }
})

const mockedAxios = axiosInstance as jest.Mocked<typeof axiosInstance>

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe("useMyPermissions 훅", () => {
  afterEach(() => {
    jest.clearAllMocks()
    jest.restoreAllMocks()
  })

  it("로딩 중일 때", () => {
    mockedAxios.get.mockImplementation(() => new Promise(() => {}))

    const { result } = renderHook(() => useMyPermissions("ws-1"), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading).toBe(true)
    expect(result.current.isOwner).toBe(false)
    expect(result.current.canCreate).toBe(false)
    expect(result.current.canRename).toBe(false)
    expect(result.current.canMove).toBe(false)
    expect(result.current.canDelete).toBe(false)
    expect(result.current.canUpdate).toBe(false)
  })

  it("owner 권한일 때", async () => {
    mockedAxios.get.mockImplementation((url) => {
      if (url.includes("/membership")) {
        return Promise.resolve({ data: { isMember: true, role: "owner" } })
      }
      if (url.includes("/roles")) {
        return Promise.resolve({ data: [] })
      }
      return Promise.reject(new Error("Invalid URL"))
    })

    const { result } = renderHook(() => useMyPermissions("ws-1"), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(mockedAxios.get).toHaveBeenCalledWith("/workspaces/ws-1/membership")
    expect(mockedAxios.get).toHaveBeenCalledWith("/workspaces/ws-1/roles")

    expect(result.current.isOwner).toBe(true)
    expect(result.current.canCreate).toBe(true)
    expect(result.current.canRename).toBe(true)
    expect(result.current.canMove).toBe(true)
    expect(result.current.canDelete).toBe(true)
    expect(result.current.canUpdate).toBe(true)
  })

  it("member 권한일 때", async () => {
    mockedAxios.get.mockImplementation((url) => {
      if (url.includes("/membership")) {
        return Promise.resolve({ data: { isMember: true, role: "member" } })
      }
      if (url.includes("/roles")) {
        return Promise.resolve({
          data: [
            {
              id: "role-member-id",
              workspace: "ws-1",
              role: "member",
              canCreate: true,
              canRename: false,
              canMove: true,
              canDelete: false,
              canUpdate: true,
            },
          ],
        })
      }
      return Promise.reject(new Error("Invalid URL"))
    })

    const { result } = renderHook(() => useMyPermissions("ws-1"), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(mockedAxios.get).toHaveBeenCalledWith("/workspaces/ws-1/membership")
    expect(mockedAxios.get).toHaveBeenCalledWith("/workspaces/ws-1/roles")

    expect(result.current.isOwner).toBe(false)
    expect(result.current.canCreate).toBe(true)
    expect(result.current.canRename).toBe(false)
    expect(result.current.canMove).toBe(true)
    expect(result.current.canDelete).toBe(false)
    expect(result.current.canUpdate).toBe(true)
  })

  it("member 역할 문서가 없을 때", async () => {
    mockedAxios.get.mockImplementation((url) => {
      if (url.includes("/membership")) {
        return Promise.resolve({ data: { isMember: true, role: "member" } })
      }
      if (url.includes("/roles")) {
        return Promise.resolve({
          data: [
            {
              id: "role-guest-id",
              workspace: "ws-1",
              role: "guest" as any,
              canCreate: true,
              canRename: true,
              canMove: true,
              canDelete: true,
              canUpdate: true,
            },
          ],
        })
      }
      return Promise.reject(new Error("Invalid URL"))
    })

    const { result } = renderHook(() => useMyPermissions("ws-1"), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(mockedAxios.get).toHaveBeenCalledWith("/workspaces/ws-1/membership")
    expect(mockedAxios.get).toHaveBeenCalledWith("/workspaces/ws-1/roles")

    expect(result.current.isOwner).toBe(false)
    expect(result.current.canCreate).toBe(false)
    expect(result.current.canRename).toBe(false)
    expect(result.current.canMove).toBe(false)
    expect(result.current.canDelete).toBe(false)
    expect(result.current.canUpdate).toBe(false)
  })

  it("API 호출 에러 상황일 때", async () => {
    mockedAxios.get.mockRejectedValue(new Error("API Error"))

    const { result } = renderHook(() => useMyPermissions("ws-1"), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(mockedAxios.get).toHaveBeenCalledWith("/workspaces/ws-1/membership")
    expect(mockedAxios.get).toHaveBeenCalledWith("/workspaces/ws-1/roles")

    expect(result.current.isOwner).toBe(false)
    expect(result.current.canCreate).toBe(false)
    expect(result.current.canRename).toBe(false)
    expect(result.current.canMove).toBe(false)
    expect(result.current.canDelete).toBe(false)
    expect(result.current.canUpdate).toBe(false)
  })
})
