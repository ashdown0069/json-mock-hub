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
        "워크스페이스의 폴더·mock API 목록을 경로로 조회합니다. create_mock_api의 parentPath나 삭제·이름변경·코드생성 대상 경로를 확인할 때 사용하세요.",
      annotations: { readOnlyHint: true, destructiveHint: false },
      inputSchema: {},
    },
    async () => withApiErrors(() => handleListMockApis(client))
  )
}
