import { normalizePath, findItemByPath, AmbiguousPathError } from "../resolvePath"
import type { FileBrowserItemRes } from "../api-client"

describe("normalizePath", () => {
  it("선행·후행 슬래시를 정돈한다", () => {
    expect(normalizePath("users/")).toBe("/users")
    expect(normalizePath("//shop//users")).toBe("/shop/users")
    expect(normalizePath("")).toBe("/")
  })
})

describe("findItemByPath", () => {
  const items = [
    { id: "1", name: "shop", path: "/shop", itemType: "Folder", parentId: null },
    { id: "2", name: "users", path: "/shop/users", itemType: "File", parentId: "1" },
  ] as FileBrowserItemRes[]

  it("정확히 일치하는 경로를 찾는다", () => {
    expect(findItemByPath(items, "/shop/users")?.id).toBe("2")
  })

  it("후보가 하나뿐이면 대소문자를 무시하고 찾는다", () => {
    expect(findItemByPath(items, "/SHOP/USERS")?.id).toBe("2")
  })

  it("없으면 null을 반환한다", () => {
    expect(findItemByPath(items, "/nope")).toBeNull()
  })
})

// API의 중복 검사와 unique 인덱스가 대소문자를 구분하므로 /products와
// /Products는 실제로 공존할 수 있다. 그 상태에서 임의로 하나를 고르면
// 삭제·갱신이 엉뚱한 항목에 적용되는 되돌릴 수 없는 손실이 된다.
describe("findItemByPath — 대소문자 모호성", () => {
  const ambiguous = [
    { id: "a", name: "products", path: "/products", itemType: "File", parentId: null },
    { id: "b", name: "Products", path: "/Products", itemType: "File", parentId: null },
  ] as FileBrowserItemRes[]

  it("대소문자만 다른 후보가 둘이면 추측하지 않고 던진다", () => {
    expect(() => findItemByPath(ambiguous, "/PRODUCTS")).toThrow(AmbiguousPathError)
  })

  it("모호한 상황에서도 정확히 일치하는 후보가 있으면 그것을 고른다", () => {
    expect(findItemByPath(ambiguous, "/products")?.id).toBe("a")
    expect(findItemByPath(ambiguous, "/Products")?.id).toBe("b")
  })

  it("오류에 실제 후보 경로를 담아 사용자가 고를 수 있게 한다", () => {
    let caught: unknown
    try {
      findItemByPath(ambiguous, "/PRODUCTS")
    } catch (error) {
      caught = error
    }

    expect(caught).toBeInstanceOf(AmbiguousPathError)
    expect((caught as AmbiguousPathError).candidates).toEqual([
      "/products",
      "/Products",
    ])
  })

  it("후보가 하나면 대소문자가 달라도 던지지 않는다", () => {
    const single = [ambiguous[0]] as FileBrowserItemRes[]
    expect(findItemByPath(single, "/PRODUCTS")?.id).toBe("a")
  })
})
