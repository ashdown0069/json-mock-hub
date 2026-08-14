import type { ApiClient, FileBrowserItemRes } from "./api-client"
import { ITEM_NAME_REGEX } from "./item-name"
import { findItemByPath, normalizePath } from "./resolve"

export type EnsureFolderResult =
  | {
      ok: true
      /** 최종 폴더의 id. 경로가 루트("/")면 null */
      parentId: string | null
      /** 이번 호출로 새로 만든 폴더 경로들. 전부 이미 있었으면 빈 배열 */
      created: string[]
    }
  | { ok: false; error: string }

/**
 * 폴더 경로를 보장한다 — 없는 중간 폴더를 위에서부터 차례로 만든다.
 *
 * 실패를 throw가 아니라 반환값으로 표현하는 이유: 호출부가 전부 MCP 도구
 * 핸들러라 toolError로 바꿔 LLM에게 돌려줘야 하는데, throw로 올리면
 * withApiErrors가 "알 수 없는 오류"로 뭉개 자가 수정 단서를 잃는다.
 *
 * items는 호출부가 이미 조회해 둔 목록을 그대로 넘긴다 — 전역 스로틀이
 * 1분 60회라 도구 하나가 목록을 두 번 받아오면 배치 작업에서 금방 걸린다.
 */
export async function ensureFolderPath(
  client: ApiClient,
  items: FileBrowserItemRes[],
  folderPath: string
): Promise<EnsureFolderResult> {
  const normalized = normalizePath(folderPath)
  if (normalized === "/") return { ok: true, parentId: null, created: [] }

  const segments = normalized.slice(1).split("/")

  // 중간에서 실패하면 앞 세그먼트만 만들어진 반쪽 상태가 남는다. 한 번이라도
  // 만들기 전에 전체 이름을 먼저 검사해 그 상황 자체를 없앤다.
  const invalid = segments.find((segment) => !ITEM_NAME_REGEX.test(segment))
  if (invalid !== undefined) {
    return {
      ok: false,
      error: `폴더 이름 "${invalid}"을(를) 쓸 수 없습니다. 한글·영문·숫자·하이픈(-)·언더바(_)만 사용할 수 있습니다.`,
    }
  }

  const created: string[] = []
  let parentId: string | null = null
  let currentPath = ""

  for (const segment of segments) {
    currentPath = `${currentPath}/${segment}`
    const existing = findItemByPath(items, currentPath)

    if (existing) {
      if (existing.itemType !== "Folder") {
        return {
          ok: false,
          error: `"${currentPath}"는 이미 mock API(File)로 존재해 폴더로 쓸 수 없습니다. 다른 경로를 지정하거나 먼저 rename_mock_api로 이름을 바꾸세요.`,
        }
      }
      parentId = existing.id
      continue
    }

    const madeFolder = await client.createItem({
      name: segment,
      itemType: "Folder",
      parentId,
    })
    parentId = madeFolder._id
    created.push(currentPath)
  }

  return { ok: true, parentId, created }
}
