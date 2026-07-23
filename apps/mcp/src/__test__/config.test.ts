import { loadConfig } from "../config"

describe("loadConfig", () => {
  it("필수 환경변수가 존재하면 올바른 설정 객체를 반환한다", () => {
    const mockEnv = {
      API_BASE_URL: "http://localhost:3000",
      MOCK_DOMAIN: "localhost:3000",
      MOCK_HUB_API_KEY: "test_key",
      MOCK_HUB_WORKSPACE_ID: "test_ws",
    }
    const config = loadConfig(mockEnv)
    expect(config).toEqual(mockEnv)
  })

  it("필수 환경변수가 누락되면 Error를 던진다", () => {
    const mockEnv = {
      API_BASE_URL: "http://localhost:3000",
      // MOCK_HUB_API_KEY 누락
      MOCK_HUB_WORKSPACE_ID: "test_ws",
    }
    expect(() => loadConfig(mockEnv)).toThrow()
  })

  it("API_BASE_URL·MOCK_DOMAIN 미설정 시 개발 api 포트(4001) 기본값을 사용한다", () => {
    const config = loadConfig({
      MOCK_HUB_API_KEY: "test_key",
      MOCK_HUB_WORKSPACE_ID: "test_ws",
    })
    expect(config.API_BASE_URL).toBe("http://localhost:4001")
    expect(config.MOCK_DOMAIN).toBe("localhost:4001")
  })
})
