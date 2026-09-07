import { generateDummyData, generateSingleObjectData } from "../generateData"
import { FieldSchema, SCHEMA_PRIMITIVES } from "@workspace/types"

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

    const [row] = generateDummyData(fields, 1, "en") as any[]
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

    const [row] = generateDummyData(fields, 1, "en") as any[]
    for (const v of row.flags) {
      expect(typeof v).toBe("boolean")
    }
  })

  it("arrayItemType이 없으면 문자열로 폴백한다 (하위호환)", () => {
    const fields: FieldSchema[] = [
      { id: "1", name: "tags", type: "array", fakerMethod: "none" },
    ]

    const [row] = generateDummyData(fields, 1, "en") as any[]
    for (const v of row.tags) {
      expect(typeof v).toBe("string")
    }
  })
})

describe("자동 증가 id 주입", () => {
  it("생성된 각 행에 id가 1부터 순차 증가로 주입된다", () => {
    const fields = [
      { id: "f1", name: "title", type: "string" as const, fakerMethod: "none" },
    ]
    const rows = generateDummyData(fields, 3, "ko")
    expect(rows.map((r: any) => r.id)).toEqual([1, 2, 3])
    // id가 첫 번째 키로 배치된다 (JSON 미리보기 가독성)
    expect(Object.keys(rows[0] as object)[0]).toBe("id")
  })

  it("사용자가 최상위에 id 필드를 정의해도 자동 증가 값이 우선한다", () => {
    const fields = [
      { id: "f1", name: "id", type: "uuid" as const, fakerMethod: "none" },
      { id: "f2", name: "title", type: "string" as const, fakerMethod: "none" },
    ]
    const rows = generateDummyData(fields, 2, "ko")
    expect(rows.map((r: any) => r.id)).toEqual([1, 2])
  })

  it("중첩 객체 내부의 id 필드는 예약어가 아니므로 그대로 생성된다", () => {
    const fields = [
      {
        id: "f1",
        name: "author",
        type: "object" as const,
        fields: [
          { id: "f2", name: "id", type: "number" as const, fakerMethod: "none" },
        ],
      },
    ]
    const rows = generateDummyData(fields, 1, "ko")
    expect((rows[0] as any).author).toHaveProperty("id")
  })
})

describe("generateDummyData — fakerMethod 안전 호출", () => {
  const field = (fakerMethod: string) => [
    { id: "1", name: "value", type: "string" as const, fakerMethod },
  ]

  it("카탈로그에 없는 constructor.name 같은 경로에 크래시하지 않는다", () => {
    expect(() =>
      generateDummyData(field("constructor.name") as never, 1, "en")
    ).not.toThrow()
  })

  it("__proto__.toString 같은 경로가 [object Object]를 만들지 않는다", () => {
    const [row] = generateDummyData(field("__proto__.toString") as never, 1, "en") as any[]
    expect(row.value).not.toBe("[object Object]")
  })

  it("존재하지 않는 메서드는 필드 타입에 맞는 기본값으로 폴백한다", () => {
    const [row] = generateDummyData(field("person.notAMethod") as never, 1, "en") as any[]
    expect(typeof row.value).toBe("string")
  })

  it("카탈로그에 있는 메서드는 정상 호출한다", () => {
    const [row] = generateDummyData(field("person.fullName") as never, 1, "en") as any[]
    expect(typeof row.value).toBe("string")
    expect((row.value as string).length).toBeGreaterThan(0)
  })

  it("필드 타입에 허용되지 않은 메서드는 무시하고 타입에 맞는 값을 만든다", () => {
    // commerce.price는 "745.69" 문자열을 반환하므로 Task 4에서 string 그룹으로 옮겼다.
    // number 필드에 이 조합이 남아 있으면 생성된 z.number()가 자기 목데이터를 거부한다.
    const [row] = generateDummyData(
      [
        {
          id: "1",
          name: "price",
          type: "number" as const,
          fakerMethod: "commerce.price",
        },
      ] as never,
      1,
      "en"
    ) as any[]

    expect(typeof row.price).toBe("number")
  })

  it("타입에 맞는 조합은 그대로 사용한다 (string + commerce.price)", () => {
    const [row] = generateDummyData(
      [
        {
          id: "1",
          name: "label",
          type: "string" as const,
          fakerMethod: "commerce.price",
        },
      ] as never,
      1,
      "en"
    ) as any[]

    expect(typeof row.label).toBe("string")
  })

  it("date 계열은 Date가 아니라 ISO 문자열로 정규화한다", () => {
    const [row] = generateDummyData(
      [{ id: "1", name: "when", type: "date" as const, fakerMethod: "date.past" }] as never,
      1,
      "en"
    ) as any[]
    expect(row.when).not.toBeInstanceOf(Date)
    expect(typeof row.when).toBe("string")
    expect(() => new Date(row.when as string).toISOString()).not.toThrow()
  })
})

describe("generateDummyData — 생성 크기 상한", () => {
  /** 깊이 n의 중첩 객체 배열 필드를 만든다 */
  const deepArrayField = (depth: number) => {
    let node: Record<string, unknown> = {
      id: "leaf",
      name: "leaf",
      type: "string",
      fakerMethod: "none",
    }
    for (let i = 0; i < depth; i += 1) {
      node = {
        id: `n${i}`,
        name: `n${i}`,
        type: "array",
        fakerMethod: "none",
        fields: [node],
      }
    }
    return [node]
  }

  it("깊이 20 × count 10에서도 2초 안에 끝난다", () => {
    const start = Date.now()
    generateDummyData(deepArrayField(20) as never, 10, "en")
    expect(Date.now() - start).toBeLessThan(2000)
  })

  it("상한을 넘는 깊이는 빈 배열로 절단한다", () => {
    const rows = generateDummyData(deepArrayField(20) as never, 1, "en")
    // 최상위부터 상한까지만 전개되고 그 아래는 빈 배열이어야 한다
    expect(JSON.stringify(rows).length).toBeLessThan(200_000)
  })

  it("정상 깊이의 배열은 기존대로 3개 원소를 만든다", () => {
    const [row] = generateDummyData(
      [
        {
          id: "1",
          name: "tags",
          type: "array" as const,
          fakerMethod: "none",
          arrayItemType: "string" as const,
        },
      ] as never,
      1,
      "en"
    ) as any[]
    expect(Array.isArray(row.tags)).toBe(true)
    expect((row.tags as unknown[]).length).toBe(3)
  })
})

describe("원시 타입 생성기의 누락 방지", () => {
  it("모든 원시 타입이 빈 문자열이 아닌 값을 만든다", () => {
    const fields: FieldSchema[] = SCHEMA_PRIMITIVES.map((primitive, index) => ({
      id: String(index),
      name: `f_${primitive}`,
      type: primitive,
      fakerMethod: "none",
    }))

    const [row] = generateDummyData(fields, 1, "en") as Record<
      string,
      unknown
    >[]

    for (const primitive of SCHEMA_PRIMITIVES) {
      // default: return "" 폴백에 걸리면 여기서 잡힌다
      expect(row![`f_${primitive}`]).not.toBe("")
      expect(row![`f_${primitive}`]).toBeDefined()
    }
  })

  it("목록 밖 타입은 빈 문자열이 아니라 null로 떨어진다", () => {
    const fields = [
      { id: "1", name: "weird", type: "email" as never, fakerMethod: "none" },
    ]

    const [row] = generateDummyData(fields, 1, "en") as Record<
      string,
      unknown
    >[]

    // ""는 "유효한 빈 문자열"과 구분되지 않아 소비자가 결함을 알 수 없다
    expect(row!.weird).toBeNull()
  })
})

describe("generateSingleObjectData — 단일 객체 리소스 생성", () => {
  it("단일 객체 형태로 반환하며 최상위 배열이 아니다", () => {
    const fields: FieldSchema[] = [
      { id: "1", name: "theme", type: "string", fakerMethod: "none" },
      { id: "2", name: "notifications", type: "boolean", fakerMethod: "none" },
    ]
    const data = generateSingleObjectData(fields, "ko")
    expect(Array.isArray(data)).toBe(false)
    expect(typeof data).toBe("object")
    expect(data).toHaveProperty("theme")
    expect(data).toHaveProperty("notifications")
    expect(typeof data.theme).toBe("string")
    expect(typeof data.notifications).toBe("boolean")
  })

  it("사용자가 id를 정의하지 않은 경우 불필요한 자동 증가 id를 주입하지 않는다", () => {
    const fields: FieldSchema[] = [
      { id: "f1", name: "appName", type: "string", fakerMethod: "none" },
    ]
    const data = generateSingleObjectData(fields, "en")
    expect(data).toHaveProperty("appName")
    expect(data).not.toHaveProperty("id")
  })

  it("사용자가 최상위에 id 필드를 정의한 경우 자동 증가 숫자로 덮어쓰지 않고 정의된 타입의 값을 보존한다", () => {
    const fields: FieldSchema[] = [
      { id: "f1", name: "id", type: "uuid", fakerMethod: "none" },
      { id: "f2", name: "version", type: "string", fakerMethod: "none" },
    ]
    const data = generateSingleObjectData(fields, "en")
    expect(data).toHaveProperty("id")
    expect(typeof data.id).toBe("string")
    // uuid 포맷 정규식 검증
    expect(data.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    )
  })
})

