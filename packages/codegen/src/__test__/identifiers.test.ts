import { toIdentifier, toPascalCase, formatObjectKey, quoteLiteral, escapeTemplate } from "../identifiers"

describe("toIdentifier 변환", () => {
  it("하이픈을 언더바로 치환한다", () => {
    expect(toIdentifier("my-api")).toBe("my_api")
  })

  it("숫자로 시작하면 언더바를 접두한다", () => {
    expect(toIdentifier("1users")).toBe("_1users")
  })

  it("한글 이름은 그대로 유지한다", () => {
    expect(toIdentifier("사용자목록")).toBe("사용자목록")
  })
})

describe("toPascalCase 변환", () => {
  it("언더바 구분 이름을 PascalCase로 변환한다", () => {
    expect(toPascalCase("my_api")).toBe("MyApi")
  })

  it("단일 단어의 첫 글자를 대문자로 만든다", () => {
    expect(toPascalCase("users")).toBe("Users")
  })
})

describe("formatObjectKey 처리", () => {
  it("유효한 식별자는 그대로 반환한다", () => {
    expect(formatObjectKey("userName")).toBe("userName")
  })

  it("무효 문자가 포함된 키는 따옴표로 감싼다", () => {
    expect(formatObjectKey("user-name")).toBe('"user-name"')
  })
})

describe("quoteLiteral", () => {
  it("일반 문자열을 따옴표로 감싼다", () => {
    expect(quoteLiteral("http://a.com/api")).toBe('"http://a.com/api"')
  })

  it("따옴표를 이스케이프해 리터럴 탈출을 막는다", () => {
    expect(quoteLiteral('http://a"; process.exit(1); //')).toBe(
      '"http://a\\"; process.exit(1); //"'
    )
  })

  it("개행과 백슬래시를 이스케이프한다", () => {
    expect(quoteLiteral("a\nb\\c")).toBe('"a\\nb\\\\c"')
  })
})

describe("escapeTemplate", () => {
  it("일반 문자열은 그대로 둔다", () => {
    expect(escapeTemplate("/users")).toBe("/users")
  })

  it("${ 를 이스케이프해 임의 표현식 평가를 막는다", () => {
    expect(escapeTemplate("/u${process.env.SECRET}s")).toBe(
      "/u\\${process.env.SECRET}s"
    )
  })

  it("백틱을 이스케이프해 템플릿 리터럴 탈출을 막는다", () => {
    expect(escapeTemplate("/a`b")).toBe("/a\\`b")
  })

  it("백슬래시를 먼저 이스케이프해 이중 처리되지 않게 한다", () => {
    expect(escapeTemplate("a\\b")).toBe("a\\\\b")
  })
})
