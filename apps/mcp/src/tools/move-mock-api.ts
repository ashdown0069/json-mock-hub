import { z } from "zod"
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import type { ApiClient } from "../api-client"
import { findItemByPath, normalizePath } from "../resolve"
import { toolText, toolError, type ToolResult } from "../tool-result"
import { withApiErrors } from "../tool-errors"

export async function handleMoveMockApi(
  client: ApiClient,
  {
    path,
    destinationPath,
    confirmMerge,
  }: { path: string; destinationPath: string; confirmMerge?: boolean }
): Promise<ToolResult> {
  const items = await client.getItems()

  const source = findItemByPath(items, path)
  if (!source) {
    return toolError(
      `"${path}" 경로의 항목을 찾을 수 없습니다. list_mock_apis로 경로를 확인하세요.`
    )
  }

  let parentId: string | null = null
  let destLabel = ""
  if (normalizePath(destinationPath) !== "/") {
    const dest = findItemByPath(items, destinationPath)
    if (!dest || dest.itemType !== "Folder") {
      return toolError(
        `대상 폴더 경로 "${destinationPath}"를 찾을 수 없습니다. list_mock_apis로 폴더 경로를 확인하세요.`
      )
    }
    parentId = dest.id
    destLabel = dest.path
  }

  // 대상 위치에 동일 이름 Folder가 이미 있으면 서버가 병합(원본 삭제 + 자식만 이동)한다.
  // 이동 전 목록만으로 판별 가능해 성공 후 재조회 없이 안내할 수 있다.
  const willMerge =
    source.itemType === "Folder" &&
    items.some(
      (item) =>
        item.id !== source.id &&
        item.parentId === parentId &&
        item.name === source.name &&
        item.itemType === "Folder"
    )

  // 병합은 원본 폴더 문서를 삭제한다 — 되돌릴 수 없으므로 사후 안내로는 늦다.
  // 이동 전 목록만으로 판별되므로 확인을 받고 나서 실행한다.
  if (willMerge && confirmMerge !== true) {
    return toolError(
      [
        `대상 "${destLabel || "/"}"에 같은 이름의 폴더 "${source.name}"이(가) 이미 있습니다.`,
        `이동하면 "${source.path}" 폴더 문서 자체는 삭제되고 하위 항목만 옮겨집니다(되돌릴 수 없음).`,
        "사용자에게 확인한 뒤 confirmMerge: true로 다시 호출하세요.",
      ].join("\n")
    )
  }

  await client.moveItem(source.id, parentId)

  const newPath = normalizePath(`${destLabel}/${source.name}`)
  const base = `이동되었습니다: ${source.path} → ${newPath}`
  if (!willMerge) {
    return toolText(base)
  }
  return toolText(
    `${base}\n(대상에 같은 이름의 폴더가 있어 내용이 병합되었습니다. "${source.path}" 폴더 자체는 사라지고 하위 항목만 이동했습니다.)`
  )
}

export function registerMoveMockApi(server: McpServer, client: ApiClient) {
  server.registerTool(
    "move_mock_api",
    {
      title: "Mock API 이동",
      description:
        "경로로 지정한 mock API 또는 폴더를 다른 폴더로 이동합니다. " +
        "대상 폴더에 같은 이름의 폴더가 있으면 병합 확인을 요청하고(confirmMerge), 같은 이름의 mock API가 있으면 오류가 발생합니다. " +
        "루트로 이동하려면 destinationPath를 생략하거나 '/'로 지정하세요. 경로는 list_mock_apis로 확인하세요.",
      annotations: {
        // 대상에 동명 폴더가 있으면 서버가 원본 폴더 문서를 삭제한다(자식만 이동).
        // 클라이언트가 자동 승인 대상으로 분류하지 않도록 명시한다.
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
      },
      inputSchema: {
        path: z.string().describe("이동할 항목 경로 (예: /shop/users)"),
        destinationPath: z
          .string()
          .default("/")
          .describe("이동할 대상 폴더 경로 (기본 루트 '/', list_mock_apis로 확인)"),
        confirmMerge: z
          .boolean()
          .optional()
          .describe(
            "대상에 같은 이름의 폴더가 있어 병합이 필요할 때만 지정합니다. true면 원본 폴더 삭제를 승인하고 진행합니다."
          ),
      },
    },
    async (args) => withApiErrors(() => handleMoveMockApi(client, args))
  )
}
