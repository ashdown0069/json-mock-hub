import {
  collectDuplicateFieldNames,
  findDuplicateFieldIds,
  normalizeFieldNames,
} from "../fieldValidation"
import { FieldSchema } from "../schema"

// 테스트마다 6개 속성을 반복하지 않기 위한 헬퍼
const field = (
  id: string,
  name: string,
  extra: Partial<FieldSchema> = {},
): FieldSchema => ({
  id,
  name,
  type: "string",
  fakerMethod: "none",
  ...extra,
})

describe("findDuplicateFieldIds", () => {
  it("같은 스코프에 이름이 겹치면 중복 그룹의 모든 id를 반환한다", () => {
    const ids = findDuplicateFieldIds([
      field("f1", "email"),
      field("f2", "email"),
      field("f3", "name"),
    ])
    // 첫 번째만 통과시키면 사용자가 어느 행을 고쳐야 할지 모호해진다
    expect(ids).toEqual(new Set(["f1", "f2"]))
  })

  it("이름이 모두 다르면 빈 집합을 반환한다", () => {
    expect(
      findDuplicateFieldIds([field("f1", "a"), field("f2", "b")]).size,
    ).toBe(0)
  })

  it("양끝 공백을 제거한 뒤 비교한다", () => {
    const ids = findDuplicateFieldIds([
      field("f1", "email"),
      field("f2", "  email  "),
    ])
    expect(ids).toEqual(new Set(["f1", "f2"]))
  })

  it("대소문자는 구분하므로 email과 Email은 중복이 아니다", () => {
    // JSON 객체 키는 대소문자를 구분하므로 둘은 실제로 공존 가능한 유효한 스키마다
    expect(
      findDuplicateFieldIds([field("f1", "email"), field("f2", "Email")]).size,
    ).toBe(0)
  })

  it("빈 이름은 판정에서 제외한다", () => {
    // "필드 추가"를 두 번 누른 직후 빈 행 2개가 즉시 붉어지는 것을 막는다
    expect(
      findDuplicateFieldIds([field("f1", ""), field("f2", "   ")]).size,
    ).toBe(0)
  })

  it("서로 다른 부모 아래의 동명 필드는 중복이 아니다", () => {
    const ids = findDuplicateFieldIds([
      field("u", "user", { type: "object", fields: [field("u1", "name")] }),
      field("c", "company", { type: "object", fields: [field("c1", "name")] }),
    ])
    expect(ids.size).toBe(0)
  })

  it("중첩 object 안의 형제 중복도 찾아낸다", () => {
    const ids = findDuplicateFieldIds([
      field("u", "user", {
        type: "object",
        fields: [field("u1", "tag"), field("u2", "tag")],
      }),
    ])
    expect(ids).toEqual(new Set(["u1", "u2"]))
  })

  it("id가 없는 항목(서버 fieldDefs)은 결과에 담기지 않는다", () => {
    expect(
      findDuplicateFieldIds([{ name: "email" }, { name: "email" }]).size,
    ).toBe(0)
  })
})

describe("collectDuplicateFieldNames", () => {
  it("중복된 이름을 중복 없이 사전순으로 반환한다", () => {
    const names = collectDuplicateFieldNames([
      { name: "zeta" },
      { name: "zeta" },
      { name: "alpha" },
      { name: "alpha" },
      { name: "alpha" },
    ])
    expect(names).toEqual(["alpha", "zeta"])
  })

  it("중복이 없으면 빈 배열을 반환한다", () => {
    expect(collectDuplicateFieldNames([{ name: "a" }, { name: "b" }])).toEqual(
      [],
    )
  })

  it("name이 문자열이 아닌 항목은 무시한다", () => {
    // 형식 검증은 다른 DTO 규칙의 책임이다
    expect(collectDuplicateFieldNames([{ name: 1 }, { name: 1 }])).toEqual([])
  })

  it("중첩 하위의 중복 이름도 수집한다", () => {
    const names = collectDuplicateFieldNames([
      { name: "user", fields: [{ name: "tag" }, { name: "tag" }] },
    ])
    expect(names).toEqual(["tag"])
  })

  it("배열이 비어도 안전하게 빈 배열을 반환한다", () => {
    expect(collectDuplicateFieldNames([])).toEqual([])
  })
})

describe("normalizeFieldNames", () => {
  it("모든 레벨의 name을 trim한다", () => {
    const result = normalizeFieldNames([
      field("u", "  user  ", {
        type: "object",
        fields: [field("u1", " name ")],
      }),
    ])
    expect(result[0]?.name).toBe("user")
    expect(result[0]?.fields?.[0]?.name).toBe("name")
  })

  it("원본 배열과 객체를 변경하지 않는다", () => {
    const original = [field("f1", "  email  ")]
    normalizeFieldNames(original)
    expect(original[0]?.name).toBe("  email  ")
  })

  it("fields가 없는 필드에는 fields 키를 만들지 않는다", () => {
    // 빈 fields를 붙이면 primitive가 object처럼 보여 UI 렌더가 갈린다
    expect(normalizeFieldNames([field("f1", "email")])[0]).not.toHaveProperty(
      "fields",
    )
  })
})
