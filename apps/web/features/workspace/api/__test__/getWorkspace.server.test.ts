import { QueryClient } from "@tanstack/react-query"
import { workspaceKeys } from "@/lib/queryKeys"

const get = jest.fn()
jest.mock("@/lib/serverAxios", () => ({
  serverAxiosInstance: { get: (...args: unknown[]) => get(...args) },
}))

import { fetchWorkspace, getWorkspaceServer } from "../getWorkspace.server"

describe("getWorkspaceServer", () => {
  beforeEach(() => {
    get.mockReset()
  })

  it("응답을 mapWorkspace로 정규화한다", async () => {
    // membersCount 누락은 mapWorkspace가 0으로 채운다(getWorkspaceList.ts:19).
    // 서버가 정규화를 건너뛰면 클라이언트와 같은 캐시 키에 다른 형태가 들어간다.
    get.mockResolvedValue({ data: { id: "ws1", name: "shop" } })

    const workspace = await getWorkspaceServer("ws1")

    expect(workspace.membersCount).toBe(0)
  })
})

describe("fetchWorkspace", () => {
  beforeEach(() => {
    get.mockReset()
  })

  it("백엔드를 1회만 호출하고 값을 돌려준다", async () => {
    get.mockResolvedValue({ data: { id: "ws1", name: "shop", membersCount: 3 } })
    const queryClient = new QueryClient()

    const workspace = await fetchWorkspace(queryClient, "ws1")

    // prefetch + 직접 조회를 함께 하면 2회가 된다
    expect(get).toHaveBeenCalledTimes(1)
    expect(workspace.name).toBe("shop")
  })

  it("클라이언트와 같은 캐시 키에 정규화된 값을 채운다", async () => {
    get.mockResolvedValue({ data: { id: "ws1", name: "shop" } })
    const queryClient = new QueryClient()

    await fetchWorkspace(queryClient, "ws1")

    const cached = queryClient.getQueryData(workspaceKeys.detail("ws1")) as {
      membersCount: number
    }
    expect(cached.membersCount).toBe(0)
  })
})
