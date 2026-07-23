import { getMockApiBaseUrl } from "../mock-url"

describe("getMockApiBaseUrl", () => {
  it("localhost 도메인이면 http 프로토콜을 사용한다", () => {
    expect(getMockApiBaseUrl("ws123", "localhost:3000")).toBe(
      "http://ws123.localhost:3000/api"
    )
  })

  it("일반 도메인이면 https 프로토콜을 사용한다", () => {
    expect(getMockApiBaseUrl("ws123", "myrealm.cloud")).toBe(
      "https://ws123.myrealm.cloud/api"
    )
  })
})
