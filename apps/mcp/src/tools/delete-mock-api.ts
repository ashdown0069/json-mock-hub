import { z } from "zod"
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import type { ApiClient } from "../api-client"
import { findItemByPath } from "../resolve"
import { toolText, toolError, formatApiError, type ToolResult } from "../tool-result"

export async function handleDeleteMockApi(
  client: ApiClient,
  { path }: { path: string }
): Promise<ToolResult> {
  let items
  try {
    items = await client.getItems()
  } catch (error) {
    return formatApiError(error)
  }
  const item = findItemByPath(items, path)
  if (!item) {
    return toolError(
      `"${path}" 경로의 항목을 찾을 수 없습니다. list_mock_apis로 경로를 확인하세요.`
    )
  }
  try {
    await client.deleteItems([item.id])
    return toolText(`삭제되었습니다: ${item.path}`)
  } catch (error) {
    return formatApiError(error)
  }
}

export function registerDeleteMockApi(server: McpServer, client: ApiClient) {
  server.registerTool(
    "delete_mock_api",
    {
      title: "Mock API 삭제",
      description:
        "경로로 mock API 또는 폴더를 삭제합니다. 폴더를 삭제하면 하위 항목도 함께 삭제됩니다. 경로는 list_mock_apis로 확인하세요.",
      inputSchema: {
        path: z.string().describe("삭제할 항목 경로 (예: /shop/users)"),
      },
    },
    async (args) => handleDeleteMockApi(client, args)
  )
}
