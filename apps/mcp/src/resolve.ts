import type { ApiClient, FileBrowserItemRes } from "./api-client"
import { findItemByPath } from "./resolvePath"

export { normalizePath, findItemByPath, AmbiguousPathError } from "./resolvePath"

/**
 * 경로로 항목을 찾아 전체 필드(schema/json/fieldDefs 포함)까지 가져옵니다.
 * 경량 목록으로 id만 해석한 뒤 단건 조회를 한 번 더 하므로,
 * 워크스페이스 전체 mock json을 내려받지 않습니다.
 */
export async function findFullItemByPath(
  client: ApiClient,
  path: string
): Promise<FileBrowserItemRes | null> {
  const items = await client.getItems("tree")
  const light = findItemByPath(items, path)
  if (!light) return null
  return client.getItem(light.id)
}
