import en from "../../../../../messages/en.json"
import ko from "../../../../../messages/ko.json"

// en/ko의 MockApiDialog 네임스페이스가 동일한 키 집합을 갖는지, 그리고
// 다이얼로그가 참조할 필수 키가 모두 존재하는지 검증한다.
describe("MockApiDialog 메시지 카탈로그", () => {
  const REQUIRED_KEYS = [
    "titleCreate", "titleEdit", "endpointDetails", "apiPath", "apiPathPlaceholder",
    "submitCreate", "submitEdit", "cancel",
    "dataSchema", "addField", "fieldNamePlaceholder", "fakerMethodPlaceholder",
    "fakerNone", "emptyFields",
    "generationOptions", "mockItems", "itemsCount", "apiFeatures",
    "paginationMetadata", "pageParam", "limitParam",
    "pageParamPlaceholder", "limitParamPlaceholder",
    "sortFeature", "sortParam", "orderParam",
    "sortParamPlaceholder", "orderParamPlaceholder",
    "searchFeature", "searchParam", "searchParamPlaceholder",
  ]

  it("en과 ko의 MockApiDialog 키 집합이 완전히 동일하다", () => {
    const enKeys = Object.keys((en as any).MockApiDialog).sort()
    const koKeys = Object.keys((ko as any).MockApiDialog).sort()
    expect(enKeys).toEqual(koKeys)
  })

  it("다이얼로그가 참조하는 필수 키가 en/ko 모두에 존재한다", () => {
    for (const key of REQUIRED_KEYS) {
      expect((en as any).MockApiDialog).toHaveProperty(key)
      expect((ko as any).MockApiDialog).toHaveProperty(key)
    }
  })

  it("ko의 titleCreate/titleEdit는 영어 원문이 아니다(번역 완료)", () => {
    expect((ko as any).MockApiDialog.titleCreate).not.toBe("New Mock API")
    expect((ko as any).MockApiDialog.titleEdit).not.toBe("Edit Mock API")
  })
})
