// 여러 feature(mock-api, code-gen, file-browser)가 공유하는 스키마 도메인 타입

// 기본 타입 이름
export type SchemaPrimitive =
  | "string"
  | "number"
  | "boolean"
  | "date"
  | "uuid"
  | "objectId"

// 배열 타입: { type: "array", items: ... }
export interface SchemaArrayType {
  type: "array"
  items: SchemaType
}

// 하나의 필드가 가질 수 있는 타입 = 기본타입 | 배열 | 중첩 객체(재귀)
export type SchemaType = SchemaPrimitive | SchemaArrayType | SchemaObject

// 스키마 자체: key -> 타입
export interface SchemaObject {
  [key: string]: SchemaType
}

// Mock API 생성 시 설정할 수 있는 옵션 구조 (페이지네이션 정보 포함)
export interface MockApiOptions {
  pagination: boolean
  paginationParams?: {
    pageParam: string
    limitParam: string
  }
}

/** UI·생성·변환 로직이 공유하는 필드 타입 목록 (단일 진실 원천) */
export const FIELD_TYPES = [
  "string",
  "number",
  "boolean",
  "date",
  "uuid",
  "objectId",
  "object",
  "array",
] as const

export type FieldType = (typeof FIELD_TYPES)[number]

export interface FieldSchema {
  id: string
  name: string
  type: FieldType
  fakerMethod?: string
  fields?: FieldSchema[] // object/array(객체 배열) 중첩용
  arrayItemType?: SchemaPrimitive // 스칼라 배열의 원소 타입 (예: number 배열의 "number")
}
