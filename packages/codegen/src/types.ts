import { SchemaObject, ResolvedMockParams } from "@workspace/types"

export type CodeLang = "js" | "ts"
export type ValidationLib = "zod" | "yup" | "joi"
export type HttpClientLib = "axios" | "fetch"

// 코드 생성기에 전달되는 Mock API 컨텍스트.
// pagination/sort/search는 ResolvedMockParams에서 상속한다 — 옵션 해석 규칙이
// 이 파일에도 있으면 기본 파라미터명이 두 곳에 존재하게 된다.
export interface CodeGenContext extends ResolvedMockParams {
  /** 함수/변수명용 식별자 (예: users) */
  resourceName: string
  /** 타입명용 PascalCase 식별자 (예: Users) */
  typeName: string
  /** 실제 호출 가능한 목서버 Base URL (예: http://ws1.localhost:3000/api) */
  baseUrl: string
  /** 아이템 전체 경로 (예: /shop/users) */
  resourcePath: string
  schema: SchemaObject
}

