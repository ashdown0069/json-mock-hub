import { SchemaObject } from "@workspace/types"

export type CodeLang = "js" | "ts"
export type ValidationLib = "zod" | "yup" | "joi"
export type HttpClientLib = "axios" | "fetch"

// 코드 생성기에 전달되는 Mock API 컨텍스트
export interface CodeGenContext {
  /** 함수/변수명용 식별자 (예: users) */
  resourceName: string
  /** 타입명용 PascalCase 식별자 (예: Users) */
  typeName: string
  /** 실제 호출 가능한 목서버 Base URL (예: http://ws1.localhost:3000/api) */
  baseUrl: string
  /** 아이템 전체 경로 (예: /shop/users) */
  resourcePath: string
  schema: SchemaObject
  /** 페이지네이션 옵션 활성화 시 파라미터명, 비활성화면 null */
  pagination: { pageParam: string; limitParam: string } | null
}
