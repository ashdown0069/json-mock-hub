import { AxiosError, type InternalAxiosRequestConfig } from "axios"
import {
  axiosInstance,
  authAxios,
  requestAccessTokenRefresh,
} from "../axios"

/**
 * axiosInstance의 인터셉터 동작을 고정하는 특성화 테스트.
 *
 * 이 파일은 23개 feature 파일이 의존하는 공용 HTTP 인스턴스이다.
 * 라이브러리 교체 전후로 이 테스트가 동일하게 통과해야 회귀가 없다고 말할 수 있다.
 */
describe("axiosInstance 인터셉터", () => {
  const requests: InternalAxiosRequestConfig[] = []

  beforeEach(() => {
    requests.length = 0
    // jsdom은 실제 페이지 이동을 지원하지 않으므로 location을 교체 가능한 객체로 바꾼다
    Object.defineProperty(window, "location", {
      value: { href: "" },
      writable: true,
      configurable: true,
    })
  })

  /** 지정한 경로에 대해서만 401을 내고, 나머지는 200을 주는 adapter를 설치한다 */
  const installAdapter = (options: {
    failUntilRefresh?: boolean
    refreshFails?: boolean
  }) => {
    let refreshed = false

    const adapter = async (config: InternalAxiosRequestConfig) => {
      requests.push(config)

      const isRefreshCall = (config.url ?? "").includes("/auth/refresh")

      if (isRefreshCall) {
        if (options.refreshFails) {
          throw new AxiosError("Unauthorized", "ERR_BAD_REQUEST", config, null, {
            status: 401,
            statusText: "Unauthorized",
            data: {},
            headers: {},
            config,
          } as never)
        }
        refreshed = true
        return {
          data: { ok: true },
          status: 200,
          statusText: "OK",
          headers: {},
          config,
        }
      }

      if (options.failUntilRefresh && !refreshed) {
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

    axiosInstance.defaults.adapter = adapter
    authAxios.defaults.adapter = adapter
  }

  const refreshCallCount = () =>
    requests.filter((r) => (r.url ?? "").includes("/auth/refresh")).length

  it("상태 변경 요청에는 CSRF 헤더를 붙인다", async () => {
    installAdapter({})

    await axiosInstance.post("/workspaces", { name: "x" })

    expect(requests[0]!.headers["X-Requested-With"]).toBe("XMLHttpRequest")
  })

  it("GET 요청에는 CSRF 헤더를 붙이지 않는다", async () => {
    installAdapter({})

    await axiosInstance.get("/workspaces")

    expect(requests[0]!.headers["X-Requested-With"]).toBeUndefined()
  })

  it("401을 받으면 refresh를 호출한 뒤 원래 요청을 재시도한다", async () => {
    installAdapter({ failUntilRefresh: true })

    const res = await axiosInstance.get("/workspaces")

    expect(res.status).toBe(200)
    expect(refreshCallCount()).toBe(1)
    // 최초 401 요청 + refresh + 재시도 = 3
    expect(requests).toHaveLength(3)
  })

  it("동시에 401을 받은 여러 요청이 있어도 refresh는 한 번만 호출된다", async () => {
    installAdapter({ failUntilRefresh: true })

    await Promise.all([
      axiosInstance.get("/a"),
      axiosInstance.get("/b"),
      axiosInstance.get("/c"),
    ])

    // 이 단언이 이 파일의 핵심이다 — refresh 토큰 회전이 겹치면 세션이 끊긴다
    expect(refreshCallCount()).toBe(1)
  })

  it("refresh 자체가 실패하면 요청은 거부되고 로그인 화면으로 보낸다", async () => {
    installAdapter({ failUntilRefresh: true, refreshFails: true })

    await expect(axiosInstance.get("/workspaces")).rejects.toBeDefined()
    expect(window.location.href).toBe("/")
  })

  it("REST 401과 SSE 복구가 진행 중 refresh 하나를 공유한다", async () => {
    installAdapter({ failUntilRefresh: true })
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const adapter = authAxios.defaults.adapter as import("axios").AxiosAdapter
    authAxios.defaults.adapter = async (config) => {
      await gate
      return adapter(config)
    }

    const rest = axiosInstance.get("/a")
    const sseA = requestAccessTokenRefresh()
    const sseB = requestAccessTokenRefresh()
    await new Promise((resolve) => setTimeout(resolve, 0))
    release()

    await Promise.all([rest, sseA, sseB])
    expect(refreshCallCount()).toBe(1)
  })

  it("refresh 실패 원인을 보존하고 다음 호출은 새 요청을 시작한다", async () => {
    installAdapter({ refreshFails: true })
    await expect(requestAccessTokenRefresh()).rejects.toMatchObject({
      response: { status: 401 },
    })

    installAdapter({})
    await expect(requestAccessTokenRefresh()).resolves.toBeUndefined()
    expect(refreshCallCount()).toBe(2)
  })
})
