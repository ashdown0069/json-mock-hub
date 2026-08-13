import { fakerEN } from "@faker-js/faker"
import {
  FAKER_BY_TYPE,
  fakerMethodsForType,
  isFakerMethodAllowed,
} from "../fakerMethods"

const FIELD_TYPES_WITH_FAKER = [
  "string",
  "number",
  "boolean",
  "date",
  "uuid",
] as const

/** 카탈로그를 "module.method" 문자열 배열로 평탄화한다 */
const flatten = (type: string): string[] =>
  Object.entries(FAKER_BY_TYPE[type] ?? {}).flatMap(([module, methods]) =>
    methods.map((method) => `${module}.${method}`)
  )

describe("FAKER_BY_TYPE 카탈로그", () => {
  it.each(FIELD_TYPES_WITH_FAKER)(
    "%s 타입에 사용 가능한 메서드가 하나 이상 있다",
    (type) => {
      expect(flatten(type).length).toBeGreaterThan(0)
    }
  )

  it("objectId는 더 이상 유효한 스키마 타입이 아니므로 빈 카탈로그를 반환한다 (uuid로 통합됨)", () => {
    expect(flatten("objectId")).toEqual([])
  })

  it.each(FIELD_TYPES_WITH_FAKER)(
    "%s 카탈로그의 모든 항목이 실제로 호출 가능한 함수다",
    (type) => {
      for (const dotPath of flatten(type)) {
        const [moduleName, methodName] = dotPath.split(".")
        const module = (fakerEN as unknown as Record<string, unknown>)[
          moduleName as string
        ]
        expect(module).toBeDefined()
        const fn = (module as Record<string, unknown>)[methodName as string]
        expect(typeof fn).toBe("function")
      }
    }
  )

  it("string 카탈로그는 문자열만 반환한다", () => {
    for (const dotPath of flatten("string")) {
      const [moduleName, methodName] = dotPath.split(".")
      const module = (fakerEN as unknown as Record<string, any>)[
        moduleName as string
      ]
      const fn = module[methodName as string]
      if (typeof fn !== "function") {
        throw new Error(`Faker method not found in string catalog: ${dotPath}`)
      }
      const value = fn.call(module)
      expect(typeof value).toBe("string")
    }
  })

  it("number 카탈로그는 숫자만 반환한다 (문자열 반환 메서드가 섞이면 생성 코드가 자기 데이터를 거부한다)", () => {
    for (const dotPath of flatten("number")) {
      const [moduleName, methodName] = dotPath.split(".")
      const module = (fakerEN as unknown as Record<string, any>)[
        moduleName as string
      ]
      const value = module[methodName as string].call(module)
      expect(typeof value).toBe("number")
    }
  })

  it("boolean 카탈로그는 불린만 반환한다", () => {
    for (const dotPath of flatten("boolean")) {
      const [moduleName, methodName] = dotPath.split(".")
      const module = (fakerEN as unknown as Record<string, any>)[
        moduleName as string
      ]
      expect(typeof module[methodName as string].call(module)).toBe("boolean")
    }
  })
})

describe("fakerMethodsForType / isFakerMethodAllowed", () => {
  it("타입의 카탈로그를 module.method 문자열로 평탄화한다", () => {
    const methods = fakerMethodsForType("number")

    // number에 허용된 것은 location.latitude/longitude, number.int/float뿐이다
    expect(methods).toEqual(
      expect.arrayContaining([
        "location.latitude",
        "location.longitude",
        "number.int",
        "number.float",
      ]),
    )
    expect(methods).toHaveLength(4)
  })

  it("카탈로그에 없는 타입은 빈 배열을 반환한다", () => {
    // object/array는 카탈로그에 없다. {}로 폴백하면 "모든 메서드 거부"와
    // 구분되지 않아 소비자가 오류 메시지를 만들 수 없다.
    expect(fakerMethodsForType("object")).toEqual([])
  })

  it("타입에 맞는 조합만 허용한다", () => {
    // commerce.price는 "745.69" 문자열을 반환하므로 string 소속이다
    expect(isFakerMethodAllowed("string", "commerce.price")).toBe(true)
    expect(isFakerMethodAllowed("number", "commerce.price")).toBe(false)
  })

  it("존재하지 않는 메서드는 거부한다", () => {
    expect(isFakerMethodAllowed("string", "person.nope")).toBe(false)
    expect(isFakerMethodAllowed("string", "__proto__.toString")).toBe(false)
  })
})
