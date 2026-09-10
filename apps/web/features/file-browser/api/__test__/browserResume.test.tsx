import React from "react"
import { renderHook, act, waitFor } from "@testing-library/react"
import {
  QueryClient,
  QueryClientProvider,
  focusManager,
  onlineManager,
} from "@tanstack/react-query"
import { axiosInstance } from "@/lib/axios"
import { useGetBrowserItems } from "../getBrowserItems"

jest.mock("@/lib/axios", () => ({ axiosInstance: { get: jest.fn() } }))
const get = jest.mocked(axiosInstance.get)

afterEach(() => {
  focusManager.setFocused(undefined)
  onlineManager.setOnline(true)
  jest.resetAllMocks()
})

it.each(["focus", "online"] as const)(
  "fresh 목록도 %s 복귀 시 재조회한다",
  async (event) => {
    onlineManager.setOnline(true)
    focusManager.setFocused(true)
    const client = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: 1_800_000,
          refetchOnWindowFocus: false,
          refetchOnMount: false,
        },
      },
    })
    const before = [{ id: "1", name: "before", itemType: "File" }]
    const after = [{ id: "1", name: "after", itemType: "File" }]
    get.mockResolvedValueOnce({ data: before }).mockResolvedValue({ data: after })
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
    const { result, unmount } = renderHook(() => useGetBrowserItems("ws1"), {
      wrapper,
    })
    await waitFor(() => expect(result.current.data).toEqual(before))
    act(() => {
      if (event === "focus") focusManager.setFocused(false)
      else onlineManager.setOnline(false)
    })
    act(() => {
      if (event === "focus") focusManager.setFocused(true)
      else onlineManager.setOnline(true)
    })
    await waitFor(() => expect(result.current.data).toEqual(after))
    expect(get).toHaveBeenCalledTimes(2)
    unmount()
    client.clear()
  }
)
