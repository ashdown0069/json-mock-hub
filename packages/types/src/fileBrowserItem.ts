import type { FieldSchema, MockApiOptions } from "./schema"

export type FileBrowserItemType = "File" | "Folder"

/**
 * filebrowser 아이템의 공식 전송 계약 (단일 진실 원천; SSOT).
 *
 * 스키마 정의의 단일 원천인 fields: FieldSchema[] | null을 기반으로 하며,
 * apps/api, apps/web, apps/mcp의 모든 파일 브라우저 모델이 이 계약을 공유한다.
 */
export interface FileBrowserItemContract {
  id: string
  name: string
  itemType: FileBrowserItemType
  parentId: string | null
  options: MockApiOptions | null
  json: unknown
  fields: FieldSchema[] | null
  path: string
  depth: number
  workspace: string
}

/**
 * POST /:workspaceId/filebrowser/createItem 의 응답.
 *
 * @Serialize(FilebrowserItems)가 적용되어 id와 path를 보장한다.
 */
export interface CreatedItemResponse {
  id: string
  path: string
}
