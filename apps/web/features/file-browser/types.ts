import { FieldSchema } from "@/types/schema"

export interface FileItem {
  id: string
  name: string
  itemType: "File" | "Folder"
  path?: string
  depth?: number
  parentId?: string | null
  createdAt?: Date
  updatedAt?: Date
  schema?: Record<string, unknown>
  json?: unknown
  options?: {
    pagination?: boolean
    paginationParams?: {
      pageParam: string
      limitParam: string
    }
  }
  fieldDefs?: FieldSchema[] | null
}

//react-arborist 용 변환 타입
export interface FileTree {
  id: string
  name: string
  itemType: "File" | "Folder"
  isDeleted?: Date | null
  path?: string
  depth?: number
  parentId?: string | null
  createdAt?: Date
  updatedAt?: Date
  schema?: Record<string, unknown>
  json?: unknown
  options?: {
    pagination?: boolean
    paginationParams?: {
      pageParam: string
      limitParam: string
    }
  }
  fieldDefs?: FieldSchema[] | null
  children?: FileTree[] // react-arborist 재귀 중첩 구조
}
