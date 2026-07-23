import { cn, formatDate } from "../utils"

describe("cn", () => {
  it("거짓 값 및 조건부 클래스를 제외하고 올바르게 병합해야 한다", () => {
    expect(cn("a", false && "b", undefined, "c")).toBe("a c")
  })

  it("Tailwind 클래스 충돌이 해결되어야 한다 (마지막 클래스가 우선 적용)", () => {
    expect(cn("p-2", "p-4")).toBe("p-4")
  })

  it("객체 및 배열 형태의 인자도 올바르게 처리하여 병합해야 한다", () => {
    expect(cn(["a", "b"], { c: true, d: false })).toBe("a b c")
  })
})

describe("formatDate", () => {
  it("ISO string으로부터 YYYY-MM-DD 포맷의 문자열을 반환해야 한다", () => {
    expect(formatDate("2026-07-16T12:34:56.000Z")).toBe("2026-07-16")
  })

  it("유효하지 않은 날짜 포맷이 전달될 경우 빈 문자열을 반환해야 한다", () => {
    expect(formatDate("invalid-date")).toBe("")
    expect(formatDate("")).toBe("")
  })

  it("null 또는 undefined가 전달될 경우 빈 문자열을 반환해야 한다", () => {
    expect(formatDate(null)).toBe("")
    expect(formatDate(undefined)).toBe("")
  })
})
