import { AxiosError, type InternalAxiosRequestConfig } from "axios"

const mockCookieStore = { get: jest.fn() }
jest.mock("next/headers", () => ({
  cookies: jest.fn(async () => mockCookieStore),
}))

import { serverAxiosInstance } from "../serverAxios"
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/const/cookies"

/** jsdom에는 Response가 없으므로, refreshRes.ok / refreshRes.headers.getSetCookie()를 흉내 낸다 */
function fakeResponse(
  status: number,
  setCookie?: string
): { ok: boolean; status: number; headers: { getSetCookie: () => string[] } } {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      getSetCookie: () => (setCookie ? [setCookie] : []),
    },
  }
}

describe("serverAxios 401 재시도", () => {
  const sentCookies: string[] = []

  beforeEach(() => {
    sentCookies.length = 0
    jest.restoreAllMocks()

    // 서버 쿠키 저장소에는 만료된 access token만 남아 있는 상황
    mockCookieStore.get.mockImplementation((name: string) => {
      if (name === ACCESS_TOKEN_COOKIE) return { value: "OLD_EXPIRED" }
      if (name === REFRESH_TOKEN_COOKIE) return { value: "R1" }
      return undefined
    })
  })

  /** 첫 호출은 401, 두 번째부터는 200을 돌려주는 adapter를 설치한다 */
  const installAdapter = (failFirst = true) => {
    let call = 0
    serverAxiosInstance.defaults.adapter = async (
      config: InternalAxiosRequestConfig
    ) => {
      sentCookies.push(String(config.headers.Cookie ?? ""))
      call += 1

      if (failFirst && call === 1) {
        throw new AxiosError("Unauthorized", "ERR_BAD_REQUEST", config, null, {
          status: 401,
          statusText: "Unauthorized",
          data: {},
          headers: {},
          config,
        } as never)
      }

      return {
        data: { ok: true },
        status: 200,
        statusText: "OK",
        headers: {},
        config,
      }
    }
  }

  const mockRefreshOk = () => {
    globalThis.fetch = jest.fn().mockResolvedValue(
      fakeResponse(200, `${ACCESS_TOKEN_COOKIE}=NEW_ACCESS; Path=/; HttpOnly`)
    )
  }

  it("재시도 요청은 갱신된 access token을 보낸다", async () => {
    installAdapter()
    mockRefreshOk()

    await serverAxiosInstance.get("/workspaces")

    expect(sentCookies).toHaveLength(2)
    expect(sentCookies[0]).toContain("OLD_EXPIRED")
    expect(sentCookies[1]).toContain("NEW_ACCESS")
    expect(sentCookies[1]).not.toContain("OLD_EXPIRED")
  })

  it("재시도 요청에도 refresh token은 함께 실어 보낸다", async () => {
    installAdapter()
    mockRefreshOk()

    await serverAxiosInstance.get("/workspaces")

    expect(sentCookies[1]).toContain(`${REFRESH_TOKEN_COOKIE}=R1`)
  })

  it("401이 아닌 최초 성공 요청은 저장소의 쿠키를 그대로 쓴다", async () => {
    installAdapter(false)

    await serverAxiosInstance.get("/workspaces")

    expect(sentCookies).toHaveLength(1)
    expect(sentCookies[0]).toContain("OLD_EXPIRED")
  })

  it("refresh 응답에 새 토큰이 없으면 재시도하지 않고 원래 401을 그대로 던진다", async () => {
    installAdapter()
    globalThis.fetch = jest.fn().mockResolvedValue(fakeResponse(200))

    await expect(serverAxiosInstance.get("/workspaces")).rejects.toMatchObject({
      response: { status: 401 },
    })
    expect(sentCookies).toHaveLength(1)
  })

  it("refresh 자체가 실패하면 재시도하지 않는다", async () => {
    installAdapter()
    globalThis.fetch = jest.fn().mockResolvedValue(fakeResponse(401))

    await expect(serverAxiosInstance.get("/workspaces")).rejects.toBeDefined()
    expect(sentCookies).toHaveLength(1)
  })
})
