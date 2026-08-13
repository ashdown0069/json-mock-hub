import { z } from "zod"
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import type { ApiClient } from "../api-client"
import { findItemByPath } from "../resolve"
import { toolText, toolError, type ToolResult } from "../tool-result"
import { withApiErrors } from "../tool-errors"

export async function handleResetMockState(
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
  if (item.itemType !== "File") {
    return toolError(`"${path}"는 폴더입니다. mock API(File) 경로를 지정하세요.`)
  }

  await client.resetMockState(item.id)

  return toolText(
    [
      `mock 런타임 상태를 초기화했습니다: ${item.path}`,
      "mock 서버로 POST/PUT/PATCH/DELETE한 변경이 모두 사라지고 저장된 원본 데이터로 돌아갑니다.",
      "저장된 데이터(스키마·json) 자체는 그대로이므로, 데이터를 새로 만들고 싶다면 update_mock_api를 사용하세요.",
    ].join("\n")
  )
}

export function registerResetMockState(server: McpServer, client: ApiClient) {
  server.registerTool(
    "reset_mock_state",
    {
      title: "Mock 런타임 상태 초기화",
      description:
        "mock 서버로 생성·수정·삭제한 런타임 변경을 폐기하고 저장된 원본 데이터로 되돌립니다. " +
        "저장된 스키마와 json은 바뀌지 않습니다. 데이터 자체를 새로 만들려면 update_mock_api를 사용하세요.",
      annotations: {
        // 폐기된 런타임 편집은 되돌릴 수 없다. 같은 인자로 다시 불러도 결과는 같다.
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
      },
      inputSchema: {
        path: z.string().describe("초기화할 mock API 경로 (예: /shop/users)"),
      },
    },
    async (args) => withApiErrors(() => handleResetMockState(client, args))
  )
}
