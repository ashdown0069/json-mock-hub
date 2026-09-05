const mockCookieStore = { toString: () => "ACCESS_TOKEN=test; REFRESH_TOKEN=ref" }
jest.mock("next/headers", () => ({
  cookies: jest.fn(async () => mockCookieStore),
}))

import { checkWorkspaceMembership } from "../checkMembership.server"

describe("checkWorkspaceMembership (Native Fetch 기반)", () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    jest.restoreAllMocks()
    jest.spyOn(console, "error").mockImplementation(() => undefined)
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it("성공하면 status: ok와 멤버십 정보를 반환한다", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ isMember: true, role: "owner" }),
    } as Response)

    const result = await checkWorkspaceMembership("ws1")
    expect(result).toEqual({
      status: "ok",
      isMember: true,
      role: "owner",
    })
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/workspaces/ws1/membership"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Cookie: "ACCESS_TOKEN=test; REFRESH_TOKEN=ref",
        }),
      })
    )
  })

  it("401 응답 시 unauthenticated를 반환한다", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({}),
    } as Response)

    const result = await checkWorkspaceMembership("ws1")
    expect(result).toEqual({ status: "unauthenticated" })
  })

  it("403 응답 시 isMember: false인 ok를 반환한다", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({}),
    } as Response)

    const result = await checkWorkspaceMembership("ws1")
    expect(result).toEqual({
      status: "ok",
      isMember: false,
      role: null,
    })
  })

  it("500 응답 시 unavailable을 반환한다", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    } as Response)

    const result = await checkWorkspaceMembership("ws1")
    expect(result).toEqual({ status: "unavailable" })
  })

  it("네트워크 예외 시 unavailable을 반환한다", async () => {
    globalThis.fetch = jest.fn().mockRejectedValue(new Error("ECONNREFUSED"))

    const result = await checkWorkspaceMembership("ws1")
    expect(result).toEqual({ status: "unavailable" })
  })
})
