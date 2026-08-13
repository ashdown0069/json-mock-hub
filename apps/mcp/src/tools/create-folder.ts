import { z } from "zod"
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import type { ApiClient } from "../api-client"
import { ensureFolderPath } from "../folder-path"
import { normalizePath } from "../resolve"
import { toolText, toolError, type ToolResult } from "../tool-result"
import { withApiErrors } from "../tool-errors"

export async function handleCreateFolder(
  client: ApiClient,
  { path }: { path: string }
): Promise<ToolResult> {
  const target = normalizePath(path)
  if (target === "/") {
    return toolError(
      "루트('/')는 항상 존재하므로 만들 수 없습니다. 만들 폴더 경로를 지정하세요 (예: /shop)."
    )
  }

  const items = await client.getItems()
  const ensured = await ensureFolderPath(client, items, target)
  if (!ensured.ok) return toolError(ensured.error)

  if (ensured.created.length === 0) {
    return toolText(`폴더 "${target}"는 이미 존재합니다. 그대로 사용하세요.`)
  }

  return toolText(
    [
      `폴더가 생성되었습니다: ${target}`,
      "새로 만든 경로:",
      ...ensured.created.map((created) => `- ${created}`),
    ].join("\n")
  )
}

export function registerCreateFolder(server: McpServer, client: ApiClient) {
  server.registerTool(
    "create_folder",
    {
      title: "폴더 생성",
      description:
        "mock API를 담을 폴더를 경로로 만듭니다. 중간 폴더가 없으면 위에서부터 함께 생성합니다(예: /shop/v1은 shop과 v1을 차례로 생성). " +
        "이미 있는 폴더는 그대로 두므로 반복 호출해도 안전합니다. " +
        "create_mock_api의 parentPath에 넘길 폴더가 아직 없을 때 먼저 호출하세요.",
      annotations: {
        // 기존 항목을 건드리지 않고 없는 폴더만 추가한다 — 같은 인자로 몇 번을 불러도 결과가 같다
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
      },
      inputSchema: {
        path: z.string().describe("만들 폴더 경로 (예: /shop/v1)"),
      },
    },
    async (args) => withApiErrors(() => handleCreateFolder(client, args))
  )
}
