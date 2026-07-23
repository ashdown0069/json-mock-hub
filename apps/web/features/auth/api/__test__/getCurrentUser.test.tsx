import React from "react"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useCurrentUser } from "../getCurrentUser"
import { getCurrentUserAction } from "../../actions/auth"

jest.mock("../../actions/auth", () => ({
  getCurrentUserAction: jest.fn(),
}))

const mockGetCurrentUserAction = getCurrentUserAction as jest.Mock

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

describe("useCurrentUser 훅", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("서버 액션이 성공적으로 사용자 객체를 반환하면 데이터를 노출해야 한다", async () => {
    const mockUser = {
      email: "test@example.com",
      nickname: "tester",
    }
    mockGetCurrentUserAction.mockResolvedValueOnce(mockUser)

    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(mockUser)
    expect(mockGetCurrentUserAction).toHaveBeenCalledTimes(1)
  })

  it("인증되지 않은 상태인 경우 데이터를 null로 노출해야 한다", async () => {
    mockGetCurrentUserAction.mockResolvedValueOnce(null)

    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toBeNull()
    expect(mockGetCurrentUserAction).toHaveBeenCalledTimes(1)
  })

  it("서버 액션 호출 실패 시 에러 상태를 노출해야 한다", async () => {
    mockGetCurrentUserAction.mockRejectedValueOnce(new Error("Network Error"))

    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toEqual(new Error("Network Error"))
    expect(mockGetCurrentUserAction).toHaveBeenCalledTimes(1)
  })
})
