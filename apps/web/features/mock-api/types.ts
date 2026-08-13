import { FieldSchema, MockApiOptions } from "@workspace/types"


export interface CreateMockApiPayload {
  name: string
  schema: Record<string, unknown>
  json: unknown
  options: MockApiOptions
  fieldDefs: FieldSchema[]
}
