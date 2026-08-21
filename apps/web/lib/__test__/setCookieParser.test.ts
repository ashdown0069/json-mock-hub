import { parseSetCookieValue } from "../setCookieParser"
import { ACCESS_TOKEN_COOKIE } from "@/const/cookies"

describe("parseSetCookieValue", () => {
  it("Set-Cookie 라인들에서 대상 이름의 쿠키 값을 추출한다", () => {
    const lines = [
      "refresh-token=r1; Path=/; Secure; HttpOnly",
      "access-token=a1; Path=/; Secure; HttpOnly; SameSite=Strict",
    ]
    expect(parseSetCookieValue(lines, ACCESS_TOKEN_COOKIE)).toBe("a1")
  })

  it("대상 이름이 없으면 null을 반환한다", () => {
    expect(
      parseSetCookieValue(["other=1; Path=/"], ACCESS_TOKEN_COOKIE)
    ).toBeNull()
  })

  it("URL 인코딩된 값을 디코딩한다", () => {
    const lines = ["access-token=a%3D1; Path=/; Secure"]
    expect(parseSetCookieValue(lines, ACCESS_TOKEN_COOKIE)).toBe("a=1")
  })

  it("값이 빈 문자열이면 null을 반환한다", () => {
    const lines = ["access-token=; Path=/; Secure"]
    expect(parseSetCookieValue(lines, ACCESS_TOKEN_COOKIE)).toBeNull()
  })
})
