import { schemaToTsInterface } from "../schemaToType"

describe("schemaToTsInterface 생성", () => {
  it("기본 타입 필드를 TS 타입으로 매핑한다", () => {
    const result = schemaToTsInterface(
      {
        name: "string",
        age: "number",
        active: "boolean",
        createdAt: "date",
        id: "uuid",
      },
      "Users"
    )
    expect(result).toContain("export interface Users {")
    expect(result).toContain("name: string;")
    expect(result).toContain("age: number;")
    expect(result).toContain("active: boolean;")
    expect(result).toContain("createdAt: string;")
    expect(result).toContain("id: string;")
  })

  it("중첩 객체와 배열을 재귀적으로 변환한다", () => {
    const result = schemaToTsInterface(
      {
        profile: { bio: "string" },
        tags: { type: "array", items: "string" },
        posts: { type: "array", items: { title: "string" } },
      },
      "Users"
    )
    expect(result).toContain("profile: {")
    expect(result).toContain("bio: string;")
    expect(result).toContain("tags: string[];")
    expect(result).toMatch(/posts: \{\s+title: string;\s+\}\[\];/)
  })

  it("빈 스키마는 빈 객체 리터럴로 표현한다", () => {
    expect(schemaToTsInterface({}, "Empty")).toBe("export interface Empty {}")
  })
})

describe("schemaToTsInterface — 비정상 값 방어", () => {
  it("null 값에 크래시하지 않고 unknown으로 폴백한다", () => {
    expect(() =>
      schemaToTsInterface({ a: null } as never, "T")
    ).not.toThrow()
    expect(schemaToTsInterface({ a: null } as never, "T")).toContain(
      "a: unknown;"
    )
  })

  it("숫자 같은 비객체 값을 unknown으로 폴백한다 ({}는 모든 값을 허용해 검증이 무력화된다)", () => {
    expect(schemaToTsInterface({ a: 123 } as never, "T")).toContain(
      "a: unknown;"
    )
  })

  it("알 수 없는 문자열 타입을 string이 아닌 unknown으로 폴백한다", () => {
    expect(schemaToTsInterface({ a: "geo" } as never, "T")).toContain(
      "a: unknown;"
    )
  })

  it("배열 items가 null이어도 크래시하지 않는다", () => {
    expect(
      schemaToTsInterface({ a: { type: "array", items: null } } as never, "T")
    ).toContain("a: unknown[];")
  })
})

describe("재귀 깊이 상한", () => {
  /** 깊이 n의 중첩 객체 스키마를 만든다 */
  const deepSchema = (depth: number): Record<string, unknown> => {
    let node: Record<string, unknown> = { leaf: "string" }
    for (let i = 0; i < depth; i += 1) {
      node = { nested: node }
    }
    return node
  }

  it("깊이 5,000에서도 스택 오버플로 없이 반환한다", () => {
    expect(() =>
      schemaToTsInterface(deepSchema(5000) as never, "T")
    ).not.toThrow()
  })

  it("상한을 넘는 깊이는 unknown으로 절단한다", () => {
    const result = schemaToTsInterface(deepSchema(50) as never, "T")
    expect(result).toContain("unknown")
  })

  it("상한 이내의 정상 스키마는 그대로 전개한다", () => {
    const result = schemaToTsInterface(
      { a: { b: { c: "string" } } } as never,
      "T"
    )
    expect(result).toContain("c: string;")
    expect(result).not.toContain("unknown")
  })
})
