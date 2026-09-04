import { z } from "zod"
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import type { ApiClient, FileBrowserItemRes } from "../api-client"
import { findItemByPath, normalizePath } from "../resolve"
import { toolText, toolError, type ToolResult } from "../tool-result"
import { withApiErrors } from "../tool-errors"

/** 삭제 대상 폴더 아래에 있는 모든 항목을 경로 접두어로 찾는다 (API가 재귀 삭제하는 범위와 동일) */
function findDescendants(
  items: FileBrowserItemRes[],
  folderPath: string
): FileBrowserItemRes[] {
  const prefix = `${normalizePath(folderPath)}/`
  return items.filter((item) => normalizePath(item.path).startsWith(prefix))
}

export async function handleDeleteMockApi(
  client: ApiClient,
  { path }: { path: string }
): Promise<ToolResult> {
  const items = await client.getItems()

  const item = findItemByPath(items, path)
  if (!item) {
    return toolError(
      `"${path}" 경로의 항목을 찾을 수 없습니다. list_mock_apis로 경로를 확인하세요.`
    )
  }

  // 폴더 삭제는 하위 전체를 재귀 삭제한다 — 무엇이 지워졌는지 사용자가 알 수 있어야 한다
  const descendants =
    item.itemType === "Folder" ? findDescendants(items, item.path) : []

  await client.deleteItems([item.id])

  if (descendants.length === 0) {
    return toolText(`삭제되었습니다: ${item.path}`)
  }

  return toolText(
    [
      `삭제되었습니다: ${item.path}`,
      `하위 항목 ${descendants.length}개가 함께 삭제되었습니다:`,
      ...descendants.map((d) => `- [${d.itemType}] ${d.path}`),
    ].join("\n")
  )
}

export function registerDeleteMockApi(server: McpServer, client: ApiClient) {
  server.registerTool(
    "delete_mock_api",
    {
      title: "Mock API 삭제",
      description:
        "경로로 지정한 Mock API 또는 폴더를 영구 삭제합니다. [경고: 폴더를 삭제하면 그 안의 모든 하위 폴더와 Mock API가 재귀적으로 함께 영구 삭제되며 복구할 수 없습니다.] 경로는 list_mock_apis로 확인하세요.",
      annotations: {
        // 되돌릴 수 없는 삭제이므로 클라이언트가 자동 승인 대상으로 분류하지 않도록 명시한다
        destructiveHint: true,
        idempotentHint: false,
        readOnlyHint: false,
      },
      inputSchema: {
        path: z
          .string()
          .describe(
            "삭제할 Mock API 또는 폴더의 절대 경로 (예: /shop/users 또는 /shop)"
          ),
      },
    },
    async (args) => withApiErrors(() => handleDeleteMockApi(client, args))
  )
}
