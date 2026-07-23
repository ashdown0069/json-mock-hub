import { getMockApiBaseUrl } from "../mockApiUrl"

describe("getMockApiBaseUrl URL 생성", () => {
  const originalEnv = process.env.NEXT_PUBLIC_MOCK_DOMAIN

  afterEach(() => {
    // 환경변수 상태 원복
    process.env.NEXT_PUBLIC_MOCK_DOMAIN = originalEnv
  })

  it("운영 도메인이면 https 서브도메인 URL을 생성한다", () => {
    process.env.NEXT_PUBLIC_MOCK_DOMAIN = "myrealm.cloud"
    expect(getMockApiBaseUrl("ws1abc")).toBe("https://ws1abc.myrealm.cloud/api")
  })

  it("localhost 도메인이면 http 프로토콜을 사용한다", () => {
    process.env.NEXT_PUBLIC_MOCK_DOMAIN = "localhost:3000"
    expect(getMockApiBaseUrl("ws1abc")).toBe("http://ws1abc.localhost:3000/api")
  })

  it("env 미설정 시 개발 api 포트(4001) 기본값을 사용한다", () => {
    delete process.env.NEXT_PUBLIC_MOCK_DOMAIN
    expect(getMockApiBaseUrl("ws1abc")).toBe("http://ws1abc.localhost:4001/api")
  })
})
