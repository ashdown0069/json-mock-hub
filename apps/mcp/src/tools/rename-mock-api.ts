import { z } from "zod"
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import type { ApiClient } from "../api-client"
import { ITEM_NAME_REGEX } from "../item-name"
import { findItemByPath } from "../resolve"
import { toolText, toolError, type ToolResult } from "../tool-result"
import { withApiErrors } from "../tool-errors"

export async function handleRenameMockApi(
  client: ApiClient,
  { path, newName }: { path: string; newName: string }
): Promise<ToolResult> {
  const items = await client.getItems()
  const item = findItemByPath(items, path)
  if (!item) {
    return toolError(
      `"${path}" 경로의 항목을 찾을 수 없습니다. list_mock_apis로 경로를 확인하세요.`
    )
  }
  await client.renameItem(item.id, newName)
  return toolText(`이름이 변경되었습니다: ${item.path} → ${newName}`)
}

export function registerRenameMockApi(server: McpServer, client: ApiClient) {
  server.registerTool(
    "rename_mock_api",
    {
      title: "Mock API 이름 변경",
      description:
        "경로로 지정한 Mock API 또는 폴더의 이름을 변경합니다. " +
        "이름 변경 시 해당 항목 및 하위 항목들의 Mock API 호출 URL 경로가 자동으로 재계산됩니다. 경로는 list_mock_apis로 확인하세요.",
      annotations: { readOnlyHint: false, destructiveHint: false },
      inputSchema: {
        path: z
          .string()
          .describe("이름을 변경할 대상 Mock API 또는 폴더 경로 (예: /shop/users)"),
        newName: z
          .string()
          .regex(
            ITEM_NAME_REGEX,
            "이름은 한글/영문/숫자/하이픈/언더바만 사용할 수 있습니다."
          )
          .describe(
            "새로운 단일 이름 (경로가 아닌 순수 이름만 입력, 예: 'members' 또는 'v2'. 영문/한글/숫자/-/_ 지원)"
          ),
      },
    },
    async (args) => withApiErrors(() => handleRenameMockApi(client, args))
  )
}
