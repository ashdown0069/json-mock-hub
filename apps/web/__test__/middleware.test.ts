jest.mock("../i18n/routing", () => ({
  routing: { locales: ["ko", "en"], defaultLocale: "ko" },
}))

jest.mock("next-intl/middleware", () => () => () => ({ status: 200, headers: new Headers() }))

import { middleware } from "../middleware"
import { REFRESH_TOKEN_COOKIE } from "@/const/cookies"

const makeRequest = (path: string, cookies: Record<string, string> = {}) => {
  const url = new URL(`http://localhost:4000${path}`)
  return {
    nextUrl: {
      pathname: url.pathname,
      clone: () => new URL(url.toString()),
    },
    cookies: {
      get: (name: string) => (cookies[name] ? { value: cookies[name] } : undefined),
    },
  } as never
}

describe("middleware 인증 가드", () => {
  it("토큰 없이 /ko/workspaces에 접근하면 /ko로 리다이렉트한다", async () => {
    const response = await middleware(makeRequest("/ko/workspaces"))

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toBe("http://localhost:4000/ko")
  })

  it("영어 로케일에서는 /en으로 리다이렉트한다", async () => {
    const response = await middleware(makeRequest("/en/workspaces"))

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toBe("http://localhost:4000/en")
  })

  it("접두사가 없는 구 URL은 기본 로케일 기준으로 판정한다", async () => {
    const response = await middleware(makeRequest("/workspaces"))

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toBe("http://localhost:4000/ko")
  })

  it("refresh 토큰이 있으면 통과시킨다 (access 만료는 SSR 인터셉터가 갱신)", async () => {
    const response = await middleware(
      makeRequest("/ko/workspaces", { [REFRESH_TOKEN_COOKIE]: "R1" })
    )

    expect(response.status).not.toBe(307)
  })

  it("보호 대상이 아닌 경로는 토큰 없이도 통과시킨다", async () => {
    const response = await middleware(makeRequest("/ko"))

    expect(response.status).not.toBe(307)
  })

  it("회원가입 페이지는 통과시킨다", async () => {
    const response = await middleware(makeRequest("/ko/signup"))

    expect(response.status).not.toBe(307)
  })
})
