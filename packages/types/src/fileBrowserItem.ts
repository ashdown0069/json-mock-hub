import type { FieldSchema, MockApiOptions, SchemaObject } from "./schema"

export type FileBrowserItemType = "File" | "Folder"

/**
 * filebrowser 아이템의 전송 계약 (단일 진실 원천).
 *
 * 같은 형태가 apps/api의 응답 DTO, apps/web의 FileItem, apps/mcp의
 * FileBrowserItemRes에 각각 손으로 선언돼 있었다. 세 곳이 어긋나도 컴파일이
 * 통과하므로 런타임에만 드러난다 — 실제로 web은 생성 응답을 id 보유로 잘못
 * 선언하고 있었다(서버는 Serialize 미적용 raw 문서라 _id를 준다).
 */
export interface FileBrowserItemContract {
  id: string
  name: string
  itemType: FileBrowserItemType
  parentId: string | null
  options: MockApiOptions | null
  json: unknown
  schema: SchemaObject | null
  fieldDefs: FieldSchema[] | null
  path: string
  depth: number
  workspace: string
}

/**
 * POST /:workspaceId/filebrowser/createItem 의 응답.
 *
 * 이 라우트만 @Serialize가 없어 mongoose 문서 원본이 그대로 나간다.
 * 따라서 id가 아니라 _id이고, 방금 보낸 json 전량이 함께 에코된다.
 */
export interface CreatedItemResponse {
  _id: string
  path: string
}
