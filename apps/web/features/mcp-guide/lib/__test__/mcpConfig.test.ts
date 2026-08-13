import {
  MCP_SERVER_NAME,
  REPO_PATH_PLACEHOLDER,
  buildMcpAddCommand,
  buildMcpServerJson,
} from "../mcpConfig"

describe("buildMcpAddCommand", () => {
  const originalBackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
  const originalMockDomain = process.env.NEXT_PUBLIC_MOCK_DOMAIN

  afterEach(() => {
    // 환경변수 상태 원복
    process.env.NEXT_PUBLIC_BACKEND_URL = originalBackendUrl
    process.env.NEXT_PUBLIC_MOCK_DOMAIN = originalMockDomain
  })

  it("local 스코프로 등록해 저장소에 설정 파일을 남기지 않는다", () => {
    const cmd = buildMcpAddCommand("ws-123", "mock_test_key")
    expect(cmd).toContain("claude mcp add")
    expect(cmd).toContain("--scope local")
  })

  it("워크스페이스 ID와 API 키를 --env로 전달한다", () => {
    const cmd = buildMcpAddCommand("ws-123", "mock_test_key")
    expect(cmd).toContain("--env MOCK_HUB_API_KEY=mock_test_key")
    expect(cmd).toContain("--env MOCK_HUB_WORKSPACE_ID=ws-123")
  })

  it("운영 환경에서는 운영 api 주소와 도메인을 가리킨다", () => {
    process.env.NEXT_PUBLIC_BACKEND_URL = "https://api.myrealm.cloud"
    process.env.NEXT_PUBLIC_MOCK_DOMAIN = "myrealm.cloud"
    const cmd = buildMcpAddCommand("ws-123", "mock_test_key")
    expect(cmd).toContain("--env API_BASE_URL=https://api.myrealm.cloud")
    expect(cmd).toContain("--env MOCK_DOMAIN=myrealm.cloud")
  })

  it("개발 환경에서는 로컬 api 주소와 도메인을 가리킨다", () => {
    process.env.NEXT_PUBLIC_BACKEND_URL = "http://localhost:4001"
    process.env.NEXT_PUBLIC_MOCK_DOMAIN = "localhost:4001"
    const cmd = buildMcpAddCommand("ws-123", "mock_test_key")
    expect(cmd).toContain("--env API_BASE_URL=http://localhost:4001")
    expect(cmd).toContain("--env MOCK_DOMAIN=localhost:4001")
  })

  it("env 미설정 시 개발 api 포트(4001) 기본값으로 폴백한다", () => {
    delete process.env.NEXT_PUBLIC_BACKEND_URL
    delete process.env.NEXT_PUBLIC_MOCK_DOMAIN
    const cmd = buildMcpAddCommand("ws-123", "mock_test_key")
    expect(cmd).toContain("--env API_BASE_URL=http://localhost:4001")
    expect(cmd).toContain("--env MOCK_DOMAIN=localhost:4001")
  })

  it("--env 다음에 서버 이름이 오지 않도록 --transport를 사이에 둔다", () => {
    const cmd = buildMcpAddCommand("ws-123", "mock_test_key")
    expect(cmd).toContain("--transport stdio json-mock-hub")
    expect(cmd.indexOf("--transport stdio json-mock-hub")).toBeGreaterThan(
      cmd.lastIndexOf("--env")
    )
  })

  it("서버 실행 명령을 -- 뒤로 분리하고 경로 플레이스홀더를 포함한다", () => {
    const cmd = buildMcpAddCommand("ws-123", "mock_test_key")
    expect(cmd).toContain(
      `-- npm --prefix ${REPO_PATH_PLACEHOLDER} run start -w apps/mcp`
    )
  })

  it("여러 줄 이어쓰기 문법은 OS마다 다르므로 한 줄로 만든다", () => {
    expect(buildMcpAddCommand("ws-123", "mock_test_key")).not.toContain("\n")
  })
})

describe("buildMcpServerJson", () => {
  const originalBackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
  const originalMockDomain = process.env.NEXT_PUBLIC_MOCK_DOMAIN

  afterEach(() => {
    // 환경변수 상태 원복
    process.env.NEXT_PUBLIC_BACKEND_URL = originalBackendUrl
    process.env.NEXT_PUBLIC_MOCK_DOMAIN = originalMockDomain
  })

  /** 테스트마다 파싱을 반복하지 않도록 서버 항목만 꺼내온다 */
  function parseServerEntry(workspaceId: string, apiKey: string) {
    const parsed = JSON.parse(buildMcpServerJson(workspaceId, apiKey))
    return parsed.mcpServers[MCP_SERVER_NAME]
  }

  it("MCP 클라이언트가 읽는 mcpServers 키 아래에 서버를 정의한다", () => {
    const parsed = JSON.parse(buildMcpServerJson("ws-123", "mock_test_key"))
    expect(Object.keys(parsed)).toEqual(["mcpServers"])
    expect(parsed.mcpServers[MCP_SERVER_NAME]).toBeDefined()
  })

  it("stdio 실행 명령을 command와 args로 나누어 담는다", () => {
    const server = parseServerEntry("ws-123", "mock_test_key")
    expect(server.command).toBe("npm")
    expect(server.args).toEqual([
      "--prefix",
      REPO_PATH_PLACEHOLDER,
      "run",
      "start",
      "-w",
      "apps/mcp",
    ])
  })

  it("apps/mcp가 요구하는 환경변수 네 개를 빠짐없이 채운다", () => {
    process.env.NEXT_PUBLIC_BACKEND_URL = "https://api.myrealm.cloud"
    process.env.NEXT_PUBLIC_MOCK_DOMAIN = "myrealm.cloud"
    const server = parseServerEntry("ws-123", "mock_test_key")
    expect(server.env).toEqual({
      MOCK_HUB_API_KEY: "mock_test_key",
      MOCK_HUB_WORKSPACE_ID: "ws-123",
      API_BASE_URL: "https://api.myrealm.cloud",
      MOCK_DOMAIN: "myrealm.cloud",
    })
  })

  it("env 미설정 시 CLI 명령과 동일하게 개발 기본값으로 폴백한다", () => {
    delete process.env.NEXT_PUBLIC_BACKEND_URL
    delete process.env.NEXT_PUBLIC_MOCK_DOMAIN
    const server = parseServerEntry("ws-123", "mock_test_key")
    expect(server.env.API_BASE_URL).toBe("http://localhost:4001")
    expect(server.env.MOCK_DOMAIN).toBe("localhost:4001")
  })

  it("CLI 명령과 같은 실행 명령을 안내해 두 설치 방법이 어긋나지 않는다", () => {
    const server = parseServerEntry("ws-123", "mock_test_key")
    const command = buildMcpAddCommand("ws-123", "mock_test_key")
    expect(command).toContain(`-- ${server.command} ${server.args.join(" ")}`)
  })

  it("CLI 명령과 같은 서버 이름을 쓴다", () => {
    const command = buildMcpAddCommand("ws-123", "mock_test_key")
    expect(command).toContain(`--transport stdio ${MCP_SERVER_NAME}`)
  })

  it("사용자가 설정 파일에 바로 붙여넣도록 2칸 들여쓰기로 포매팅한다", () => {
    expect(buildMcpServerJson("ws-123", "mock_test_key")).toContain(
      '\n  "mcpServers"'
    )
  })
})
