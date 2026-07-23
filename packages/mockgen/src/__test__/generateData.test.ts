import { generateDummyData } from "../generateData"
import type { FieldSchema } from "@workspace/types"

describe("generateDummyData - 스칼라 배열 원소 타입", () => {
  it("number 배열은 숫자 원소를 생성한다", () => {
    const fields: FieldSchema[] = [
      {
        id: "1",
        name: "scores",
        type: "array",
        fakerMethod: "none",
        arrayItemType: "number",
      },
    ]

    const [row] = generateDummyData(fields, 1, "en")
    expect(Array.isArray(row.scores)).toBe(true)
    expect(row.scores).toHaveLength(3)
    for (const v of row.scores) {
      expect(typeof v).toBe("number")
    }
  })

  it("boolean 배열은 불리언 원소를 생성한다", () => {
    const fields: FieldSchema[] = [
      {
        id: "1",
        name: "flags",
        type: "array",
        fakerMethod: "none",
        arrayItemType: "boolean",
      },
    ]

    const [row] = generateDummyData(fields, 1, "en")
    for (const v of row.flags) {
      expect(typeof v).toBe("boolean")
    }
  })

  it("arrayItemType이 없으면 문자열로 폴백한다 (하위호환)", () => {
    const fields: FieldSchema[] = [
      { id: "1", name: "tags", type: "array", fakerMethod: "none" },
    ]

    const [row] = generateDummyData(fields, 1, "en")
    for (const v of row.tags) {
      expect(typeof v).toBe("string")
    }
  })
})
