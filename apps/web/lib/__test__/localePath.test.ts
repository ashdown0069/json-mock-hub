import { localePath } from "../localePath"

describe("localePath", () => {
  it("ko(기본 로케일)는 접두사를 붙이지 않는다", () => {
    expect(localePath("ko", "/workspaces/ws1")).toBe("/workspaces/ws1")
  })

  it("en은 /en 접두사를 붙인다", () => {
    expect(localePath("en", "/workspaces/ws1")).toBe("/en/workspaces/ws1")
  })

  it("루트 경로: ko는 '/', en은 '/en' (트레일링 슬래시 없음)", () => {
    expect(localePath("ko", "/")).toBe("/")
    expect(localePath("en", "/")).toBe("/en")
  })

  it("슬래시 없는 입력도 정규화한다", () => {
    expect(localePath("en", "workspaces")).toBe("/en/workspaces")
  })
})
