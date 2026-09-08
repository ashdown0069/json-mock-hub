import type { FileBrowserItemContract } from "@workspace/types"

/**
 * filebrowser 단일 아이템 타입.
 * 공유 계약 FileBrowserItemContract를 단일 진실 원천으로 확장하되,
 * 트리 조회(json/fields 투영 제외) 및 UI 상태 유연성을 위해 기본 식별자 외 속성을 선택적으로 허용한다.
 */
export type FileItem = Partial<FileBrowserItemContract> &
  Pick<FileBrowserItemContract, "id" | "name" | "itemType"> & {
    createdAt?: Date
    updatedAt?: Date
  }

/**
 * react-arborist 재귀 트리 렌더링용 아이템 타입.
 */
export type FileTree = FileItem & {
  isDeleted?: Date | null
  children?: FileTree[]
}

