import { cn } from "../utils"

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
