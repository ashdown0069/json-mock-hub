import { nanoid } from "nanoid"

/**
 * nanoid가 이 저장소의 jsdom(CJS 변환) 환경에서 로드·실행되는지 확인한다.
 *
 * jsdom에는 crypto.randomUUID가 없다는 것이 실측으로 확인됐다(계획 문서 참고).
 * nanoid는 crypto.getRandomValues를 쓰므로 별개의 API지만, 마찬가지로 환경 의존적이라
 * 교체 전에 여기서 먼저 확인한다. 이 파일이 통과해야 아래 Step들이 의미가 있다.
 */
describe("nanoid 로딩", () => {
  it("21자 URL-safe 문자열을 반환한다", () => {
    const id = nanoid()

    expect(typeof id).toBe("string")
    expect(id).toHaveLength(21)
    expect(id).toMatch(/^[A-Za-z0-9_-]{21}$/)
  })

  it("호출할 때마다 다른 값을 반환한다", () => {
    const ids = new Set(Array.from({ length: 100 }, () => nanoid()))

    expect(ids.size).toBe(100)
  })
})
