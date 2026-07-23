import React from "react"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { axiosInstance } from "@/lib/axios"
import {
  getDashboardStats,
  useGetDashboardStats,
} from "../getDashboardStats"
import {
  getRequestLogs,
  useGetRequestLogs,
} from "../getRequestLogs"

jest.mock("@/lib/axios", () => ({
  axiosInstance: { get: jest.fn() },
}))

const mockedAxiosInstance = axiosInstance as jest.Mocked<typeof axiosInstance>
const mockedAxios = mockedAxiosInstance

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe("대시보드 API 서비스 및 훅", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("대시보드 통계 조회 함수", () => {
    it("대시보드 통계 조회 엔드포인트로 GET 요청을 전송하고 데이터를 반환해야 한다", async () => {
      const mockStats = {
        totalRoutes: 5,
        requestVolume24h: 120,
      }
      mockedAxiosInstance.get.mockResolvedValueOnce({ data: mockStats })

      const result = await getDashboardStats("workspace-id")

      expect(mockedAxiosInstance.get).toHaveBeenCalledWith(
        "/workspace-id/dashboard/stats"
      )
      expect(result).toEqual(mockStats)
    })
  })

  describe("요청 로그 조회 함수", () => {
    it("페이지 및 페이지 크기 쿼리 매개변수와 함께 요청 로그 조회 엔드포인트로 GET 요청을 전송해야 한다", async () => {
      const mockLogs = {
        data: [],
        meta: {
          page: 1,
          limit: 10,
          totalItems: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      }
      mockedAxiosInstance.get.mockResolvedValueOnce({ data: mockLogs })

      const result = await getRequestLogs("workspace-id", 1, 10)

      expect(mockedAxiosInstance.get).toHaveBeenCalledWith(
        "/workspace-id/dashboard/logs",
        {
          params: { page: 1, limit: 10 },
        }
      )
      expect(result).toEqual(mockLogs)
    })
  })

  describe("대시보드 통계 조회 훅", () => {
    it("대시보드 통계 데이터를 성공적으로 가져와야 한다", async () => {
      const mockStats = {
        totalRoutes: 10,
        requestVolume24h: 250,
      }
      mockedAxiosInstance.get.mockResolvedValueOnce({ data: mockStats })

      const { result, unmount } = renderHook(
        () => useGetDashboardStats("workspace-id"),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockStats)
      unmount()
    })

    it("useGetDashboardStats 훅은 데이터 조회 실패 시 에러 상태를 반환해야 한다", async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error("Network Error"))

      const { result, unmount } = renderHook(() => useGetDashboardStats("ws-1"), {
        wrapper: createWrapper(),
      })
      await waitFor(() => expect(result.current.isError).toBe(true))
      expect(result.current.error).toBeDefined()
      unmount()
    })
  })

  describe("요청 로그 조회 훅", () => {
    it("요청 로그 데이터를 성공적으로 가져와야 한다", async () => {
      const mockLogs = {
        data: [
          {
            id: "log-one",
            method: "GET" as const,
            path: "/test",
            status: 200,
            ip: "127.0.0.1",
            createdAt: "2026-07-16T00:00:00Z",
          },
        ],
        meta: {
          page: 1,
          limit: 20,
          totalItems: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      }
      mockedAxiosInstance.get.mockResolvedValueOnce({ data: mockLogs })

      const { result, unmount } = renderHook(
        () => useGetRequestLogs("workspace-id", 1),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockLogs)
      unmount()
    })

    it("useGetRequestLogs 훅은 데이터 조회 실패 시 에러 상태를 반환해야 한다", async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error("Network Error"))

      const { result, unmount } = renderHook(() => useGetRequestLogs("ws-1", 1), {
        wrapper: createWrapper(),
      })
      await waitFor(() => expect(result.current.isError).toBe(true))
      expect(result.current.error).toBeDefined()
      unmount()
    })
  })
})
