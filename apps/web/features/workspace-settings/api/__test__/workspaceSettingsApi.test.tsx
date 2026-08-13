import React from "react"
import { renderHook, waitFor, act } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import axiosInstance from "@/lib/axios"
import { useMembers, useRemoveMember } from "../members"
import { useRoles, useUpdateRole } from "../roles"

jest.mock("next-intl", () => ({
  useTranslations: () => {
    const t = (key: string) => key
    t.has = () => false
    return t
  },
}))

jest.mock("@/lib/axios", () => {
  const instance = {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  }
  return { __esModule: true, default: instance, axiosInstance: instance }
})

const mockedAxiosInstance = axiosInstance as jest.Mocked<typeof axiosInstance>

describe("워크스페이스 설정 API 통합 테스트", () => {
  let queryClient: QueryClient
  let invalidateSpy: jest.SpyInstance
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  beforeEach(() => {
    jest.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    invalidateSpy = jest.spyOn(queryClient, "invalidateQueries")
  })

  describe("멤버 관리 API 훅", () => {
    it("멤버 목록을 성공적으로 조회해야 한다", async () => {
      const mockMembers = [
        {
          id: "m1",
          workspace: "ws-1",
          userId: "u1",
          email: "user1@example.com",
          nickname: "User 1",
          role: "owner" as const,
          joinedAt: "2026-07-16T00:00:00Z",
        },
      ]
      mockedAxiosInstance.get.mockResolvedValueOnce({ data: mockMembers })

      const { result } = renderHook(() => useMembers("ws-1"), { wrapper })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockedAxiosInstance.get).toHaveBeenCalledWith("/workspaces/ws-1/members")
      expect(result.current.data).toEqual(mockMembers)
    })

    it("멤버를 삭제하고 멤버 목록 쿼리를 초기화해야 한다", async () => {
      mockedAxiosInstance.delete.mockResolvedValueOnce({ data: { success: true } })

      const { result } = renderHook(() => useRemoveMember("ws-1"), { wrapper })

      act(() => {
        result.current.mutate({ userId: "u1" })
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockedAxiosInstance.delete).toHaveBeenCalledWith("/workspaces/ws-1/members/u1")
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["workspace", "ws-1", "members"],
      })
    })

    it("useMembers 훅은 멤버 목록 조회 실패 시 에러 상태를 반환해야 한다", async () => {
      mockedAxiosInstance.get.mockRejectedValueOnce(new Error("Network Error"))

      const { result } = renderHook(() => useMembers("ws-1"), { wrapper })
      await waitFor(() => expect(result.current.isError).toBe(true))
      expect(result.current.error).toBeDefined()
    })

    it("useRemoveMember 훅은 멤버 삭제 실패 시 에러 상태를 반환해야 한다", async () => {
      mockedAxiosInstance.delete.mockRejectedValueOnce(new Error("Delete Error"))

      const { result } = renderHook(() => useRemoveMember("ws-1"), { wrapper })
      act(() => {
        result.current.mutate({ userId: "u1" })
      })
      await waitFor(() => expect(result.current.isError).toBe(true))
      expect(result.current.error).toBeDefined()
    })
  })

  describe("역할 관리 API 훅", () => {
    it("workspaceId가 비어 있으면 역할 목록을 요청하지 않아야 한다", () => {
      renderHook(() => useRoles(""), { wrapper })

      expect(mockedAxiosInstance.get).not.toHaveBeenCalled()
    })

    it("역할 목록을 성공적으로 조회해야 한다", async () => {
      const mockRoles = [
        {
          id: "r1",
          workspace: "ws-1",
          role: "member" as const,
          canCreate: true,
          canRename: true,
          canMove: true,
          canDelete: false,
          canUpdate: true,
        },
      ]
      mockedAxiosInstance.get.mockResolvedValueOnce({ data: mockRoles })

      const { result } = renderHook(() => useRoles("ws-1"), { wrapper })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockedAxiosInstance.get).toHaveBeenCalledWith("/workspaces/ws-1/roles")
      expect(result.current.data).toEqual(mockRoles)
    })

    it("역할의 권한을 수정하고 역할 목록 쿼리를 초기화해야 한다", async () => {
      const mockUpdatedRole = {
        id: "r1",
        workspace: "ws-1",
        role: "member" as const,
        canCreate: true,
        canRename: true,
        canMove: true,
        canDelete: true,
        canUpdate: true,
      }
      mockedAxiosInstance.patch.mockResolvedValueOnce({ data: mockUpdatedRole })

      const { result } = renderHook(() => useUpdateRole("ws-1"), { wrapper })

      act(() => {
        result.current.mutate({ roleId: "r1", permissions: { canDelete: true } })
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockedAxiosInstance.patch).toHaveBeenCalledWith(
        "/workspaces/ws-1/roles/r1",
        { canDelete: true }
      )
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["workspace", "ws-1", "roles"],
      })
      expect(result.current.data).toEqual(mockUpdatedRole)
    })

    it("useUpdateRole 훅은 역할 수정 실패 시 에러 상태를 반환해야 한다", async () => {
      mockedAxiosInstance.patch.mockRejectedValueOnce(new Error("Patch Error"))

      const { result } = renderHook(() => useUpdateRole("ws-1"), { wrapper })
      act(() => {
        result.current.mutate({ roleId: "r1", permissions: { canDelete: true } })
      })
      await waitFor(() => expect(result.current.isError).toBe(true))
      expect(result.current.error).toBeDefined()
    })

    it("useRoles 훅은 역할 목록 조회 실패 시 에러 상태를 반환해야 한다", async () => {
      mockedAxiosInstance.get.mockRejectedValueOnce(new Error("Network Error"))

      const { result } = renderHook(() => useRoles("ws-1"), { wrapper })
      await waitFor(() => expect(result.current.isError).toBe(true))
      expect(result.current.error).toBeDefined()
    })
  })
})
