import { FieldSchema } from "@workspace/types"
import type { MockApiOptions } from "@workspace/types"

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
  options?: MockApiOptions
  fieldDefs?: FieldSchema[] | null
}

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
  options?: MockApiOptions
  fieldDefs?: FieldSchema[] | null
  children?: FileTree[] // react-arborist 재귀 중첩 구조
}
