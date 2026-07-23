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
