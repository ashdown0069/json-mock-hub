// MCP 연동 화면 전용 쿼리 키.
// 키가 워크스페이스 설정에서 MCP 페이지로 옮겨졌으므로 workspaceSettings에서 분리한다.
export const mcpKeys = {
  all: (workspaceId: string) => ["workspace", workspaceId, "mcp"] as const,
  apiKey: (workspaceId: string) =>
    [...mcpKeys.all(workspaceId), "api-key"] as const,
}
