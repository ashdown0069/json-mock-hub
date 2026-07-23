import { FieldSchema, MockApiOptions } from "@/types/schema"

// 다이얼로그로부터 페이지 컴포넌트로 전달받는 Mock API 생성 Payload
export interface CreateMockApiPayload {
  name: string
  schema: Record<string, unknown>
  json: unknown
  options: MockApiOptions
  fieldDefs: FieldSchema[]
}
