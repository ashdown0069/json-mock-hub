const mockGet = jest.fn()
jest.mock("@/lib/serverAxios", () => ({
  serverAxiosInstance: { get: (...args: unknown[]) => mockGet(...args) },
}))

import { checkWorkspaceMembership } from "../checkMembership.server"

/** axios가 던지는 형태의 에러 */
const httpError = (status: number) =>
  Object.assign(new Error("failed"), {
    isAxiosError: true,
    response: { status, data: {} },
  })

describe("checkWorkspaceMembership", () => {
  beforeEach(() => {
    mockGet.mockReset()
    jest.spyOn(console, "error").mockImplementation(() => undefined)
  })

  afterEach(() => jest.restoreAllMocks())

  it("성공하면 status: ok와 멤버십 정보를 반환한다", async () => {
    mockGet.mockResolvedValue({ data: { isMember: true, role: "owner" } })

    expect(await checkWorkspaceMembership("ws1")).toEqual({
      status: "ok",
      isMember: true,
      role: "owner",
    })
  })

  it("401은 unauthenticated로 구분한다", async () => {
    mockGet.mockRejectedValue(httpError(401))

    expect(await checkWorkspaceMembership("ws1")).toEqual({
      status: "unauthenticated",
    })
  })

  it("403은 멤버가 아닌 것으로 해석한다 (로그아웃 대상이 아님)", async () => {
    mockGet.mockRejectedValue(httpError(403))

    expect(await checkWorkspaceMembership("ws1")).toEqual({
      status: "ok",
      isMember: false,
      role: null,
    })
  })

  it("500은 unavailable로 구분한다 (API 재시작이 로그아웃이 되면 안 됨)", async () => {
    mockGet.mockRejectedValue(httpError(500))

    expect(await checkWorkspaceMembership("ws1")).toEqual({
      status: "unavailable",
    })
  })

  it("네트워크 오류도 unavailable로 처리한다", async () => {
    mockGet.mockRejectedValue(new Error("ECONNREFUSED"))

    expect(await checkWorkspaceMembership("ws1")).toEqual({
      status: "unavailable",
    })
  })
})
