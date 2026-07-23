/** 해당 워크스페이스에 바로 붙여넣을 수 있는 .mcp.json 문자열을 만든다.
 * API 키·워크스페이스 ID는 서버에서 조회한 실제 값으로 자동 주입된다.
 * MCP 클라이언트는 임의 cwd에서 서버를 spawn하므로, npm --prefix로 모노레포 루트를 고정한다
 * (사용자가 <모노레포-절대경로>를 자신의 경로로 치환). */
export function buildMcpConfigJson(workspaceId: string, apiKey: string): string {
  return JSON.stringify(
    {
      mcpServers: {
        "json-mock-hub": {
          command: "npm",
          args: [
            "--prefix",
            "여기에-모노레포-절대경로",
            "run",
            "start",
            "-w",
            "apps/mcp",
          ],
          env: {
            MOCK_HUB_API_KEY: apiKey,
            MOCK_HUB_WORKSPACE_ID: workspaceId,
            API_BASE_URL: "http://localhost:4001",
            MOCK_DOMAIN: "localhost:4001",
          },
        },
      },
    },
    null,
    2
  )
}
