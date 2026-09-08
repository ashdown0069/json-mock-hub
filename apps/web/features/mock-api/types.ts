import { FieldSchema, MockApiOptions } from "@workspace/types"


export interface CreateMockApiPayload {
  name: string
  json: unknown
  options: MockApiOptions
  fields: FieldSchema[]
}

