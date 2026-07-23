import React from "react"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { axiosInstance } from "@/lib/axios"
import { useUpdateWorkspace } from "../updateWorkspace"

jest.mock("@/lib/axios", () => ({ axiosInstance: { patch: jest.fn() } }))
const mockPatch = axiosInstance.patch as jest.Mock

const wrapper = (client: QueryClient) =>
  ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )

describe("useUpdateWorkspace", () => {
  it("PATCH /workspaces/:id 로 name을 전송하고 캐시를 무효화한다", async () => {
    mockPatch.mockResolvedValueOnce({ data: { id: "w1", name: "새이름" } })
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const invalidateSpy = jest.spyOn(client, "invalidateQueries")

    const { result } = renderHook(() => useUpdateWorkspace("w1"), { wrapper: wrapper(client) })
    result.current.mutate({ name: "새이름" })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockPatch).toHaveBeenCalledWith("/workspaces/w1", { name: "새이름" })
    expect(invalidateSpy).toHaveBeenCalled()
  })
})
