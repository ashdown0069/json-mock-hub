import { buildMcpConfigJson } from "../mcpConfig"

describe("buildMcpConfigJson", () => {
  it("workspaceId와 API 키를 env에 주입한 유효한 JSON을 만든다", () => {
    const server = JSON.parse(
      buildMcpConfigJson("ws-123", "mock_test_key")
    ).mcpServers["json-mock-hub"]
    expect(server.env.MOCK_HUB_WORKSPACE_ID).toBe("ws-123")
    expect(server.env.MOCK_HUB_API_KEY).toBe("mock_test_key")
    expect(server.command).toBe("npm")
  })

  it("cwd 독립 실행을 위해 --prefix 플레이스홀더를 포함한다", () => {
    const server = JSON.parse(
      buildMcpConfigJson("ws-123", "mock_test_key")
    ).mcpServers["json-mock-hub"]
    const prefixIdx = server.args.indexOf("--prefix")
    expect(prefixIdx).toBeGreaterThanOrEqual(0)
    // --prefix 바로 뒤에 사용자가 채울 경로 플레이스홀더가 온다
    expect(server.args[prefixIdx + 1]).toContain("절대경로")
    expect(server.args).toEqual(
      expect.arrayContaining(["run", "start", "-w", "apps/mcp"])
    )
  })

  it("api 접속 정보가 개발 api 포트(4001)를 가리킨다", () => {
    const server = JSON.parse(
      buildMcpConfigJson("ws-123", "mock_test_key")
    ).mcpServers["json-mock-hub"]
    expect(server.env.API_BASE_URL).toBe("http://localhost:4001")
    expect(server.env.MOCK_DOMAIN).toBe("localhost:4001")
  })
})
