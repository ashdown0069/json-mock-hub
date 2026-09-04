import {
  CODE_OPTION_SPEC,
  sanitizeCodeOptions,
  codeOptionZodShape,
  codeOptionElicitProperties,
  codeOptionFallbackText,
} from "../tools/code-options"

describe("CODE_OPTION_SPEC", () => {
  it("세 옵션의 값 목록이 비어 있지 않다", () => {
    for (const key of ["lang", "clientMode", "validation"] as const) {
      expect(CODE_OPTION_SPEC[key].values.length).toBeGreaterThan(0)
    }
  })
})

describe("sanitizeCodeOptions", () => {
  it("허용 값은 그대로 통과한다", () => {
    expect(sanitizeCodeOptions({ lang: "js" }).lang).toBe("js")
  })

  it("허용 목록 밖 값은 제거한다", () => {
    expect(sanitizeCodeOptions({ clientMode: "ky" as never }).clientMode).toBeUndefined()
  })

  it("null/undefined는 빈 객체를 반환한다", () => {
    expect(sanitizeCodeOptions(null)).toEqual({})
    expect(sanitizeCodeOptions(undefined)).toEqual({})
  })

  it("enum 밖 값과 잘못된 타입을 함께 걸러내고 유효한 값만 남긴다", () => {
    expect(
      sanitizeCodeOptions({
        lang: "python",
        clientMode: 123,
        validation: "zod",
        extra: "x",
      })
    ).toEqual({ validation: "zod" })
  })
})

describe("파생 산출물", () => {
  it("zod shape가 spec의 값 목록과 같은 원소를 갖는다", () => {
    const shape = codeOptionZodShape()

    for (const [key, spec] of Object.entries(CODE_OPTION_SPEC)) {
      const parsed = shape[key as keyof typeof shape]!
      for (const [value] of spec.values) {
        // 하나라도 빠지면 elicitation은 뜨는데 zod가 거부한다
        expect(parsed.safeParse(value).success).toBe(true)
      }
      expect(parsed.safeParse("__nope__").success).toBe(false)
    }
  })

  it("elicit properties의 oneOf 항목에 const와 title이 모두 존재하고 값과 라벨이 매칭된다", () => {
    const properties = codeOptionElicitProperties()

    for (const [key, spec] of Object.entries(CODE_OPTION_SPEC)) {
      const prop = properties[key] as {
        type: string
        title?: string
        oneOf: Array<{ const: string; title: string }>
        default?: string
      }
      expect(prop.type).toBe("string")
      expect(prop.title).toBe(spec.title)
      expect(prop.default).toBe(spec.values[0][0])
      expect(prop.oneOf.length).toBe(spec.values.length)

      prop.oneOf.forEach((item, index) => {
        const [expectedValue, expectedLabel] = spec.values[index]!
        expect(item.const).toBe(expectedValue)
        expect(item.title).toBe(expectedLabel)
      })
    }
  })

  it("폴백 안내 문자열이 모든 허용 값을 언급한다", () => {
    const text = codeOptionFallbackText()

    for (const spec of Object.values(CODE_OPTION_SPEC)) {
      for (const [value] of spec.values) {
        expect(text).toContain(value)
      }
    }
  })
})
