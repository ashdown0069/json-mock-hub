import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import type { ApiClient } from "../api-client"
import { buildTreeText } from "../tree"
import { toolText, type ToolResult } from "../tool-result"
import { withApiErrors } from "../tool-errors"

export async function handleListMockApis(client: ApiClient): Promise<ToolResult> {
  const items = await client.getItems()
  if (items.length === 0) {
    return toolText(
      "아직 생성된 항목이 없습니다. (루트에 바로 생성하려면 create_mock_api에서 parentPath 생략)"
    )
  }
  return toolText(buildTreeText(items))
}

export function registerListMockApis(server: McpServer, client: ApiClient) {
  server.registerTool(
    "list_mock_apis",
    {
      title: "Mock API 목록 조회",
      description:
        "워크스페이스 내의 모든 폴더 및 Mock API 계층 구조를 트리 경로 형태로 조회합니다. " +
        "Mock API를 조회·수정·이동·삭제하거나 연동 코드를 생성하기 전, 대상의 정확한 경로(/path)를 확인하기 위해 가장 먼저 호출해야 하는 필수 탐색 도구입니다.",
      annotations: { readOnlyHint: true, destructiveHint: false },
      inputSchema: {},
    },
    async () => withApiErrors(() => handleListMockApis(client))
  )
}
