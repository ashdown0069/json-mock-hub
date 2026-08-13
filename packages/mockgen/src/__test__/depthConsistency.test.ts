import { MAX_SCHEMA_DEPTH } from "@workspace/types"
import { fieldsToSchema, schemaToFields } from "../convertSchema"
import { generateDummyData } from "../generateData"
import type { FieldSchema } from "@workspace/types"

/** 중첩 object 필드를 depth단 만들고 마지막에 leaf를 둔다 */
const deepObjectField = (depth: number): FieldSchema[] => {
  let node: FieldSchema = {
    id: "leaf",
    name: "leaf",
    type: "string",
    fakerMethod: "none",
  }
  for (let i = depth; i > 0; i -= 1) {
    node = {
      id: `n${i}`,
      name: "nested",
      type: "object",
      fakerMethod: "none",
      fields: [node],
    }
  }
  return [node]
}

/** 값이 객체인 동안 nested를 따라 내려가며 온전한 중첩 레벨 수를 센다 */
const measureDepth = (value: unknown): number => {
  let depth = 0
  let cursor: any = value
  while (
    cursor &&
    typeof cursor === "object" &&
    !Array.isArray(cursor) &&
    "nested" in cursor
  ) {
    depth += 1
    cursor = cursor.nested
  }
  return depth
}

describe("스키마 절단 깊이와 데이터 절단 깊이", () => {
  // 상한을 넉넉히 넘는 깊이로 만들어 양쪽 모두 절단되게 한다
  const fields = deepObjectField(MAX_SCHEMA_DEPTH + 4)

  it("두 상한이 같은 값을 쓴다", () => {
    // 값이 갈리면 "생성된 검증 코드가 자기 목데이터를 거부"하는 상태가 된다
    expect(MAX_SCHEMA_DEPTH).toBe(8)
  })

  it("fieldsToSchema와 generateDummyData가 같은 레벨에서 절단한다", () => {
    const schema = fieldsToSchema(fields)
    const [row] = generateDummyData(fields, 1, "en") as Record<
      string,
      unknown
    >[]

    expect(measureDepth(schema)).toBe(measureDepth(row))
  })

  it("절단 지점은 상한과 일치한다", () => {
    const schema = fieldsToSchema(fields)

    // 레벨 0(최상위)의 nested부터 세므로 온전한 중첩 수는 상한과 같다
    expect(measureDepth(schema)).toBe(MAX_SCHEMA_DEPTH)
  })

  it("schemaToFields도 같은 상한으로 절단한다", () => {
    const schema = fieldsToSchema(fields)
    const roundTripped = schemaToFields(schema)

    let depth = 0
    let cursor: FieldSchema[] | undefined = roundTripped
    while (cursor && cursor.length > 0 && cursor[0]!.name === "nested") {
      depth += 1
      cursor = cursor[0]!.fields
    }
    expect(depth).toBe(MAX_SCHEMA_DEPTH)
  })
})
