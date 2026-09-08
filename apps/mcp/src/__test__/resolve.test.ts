import {
  normalizePath,
  findItemByPath,
  findFullItemByPath,
  AmbiguousPathError,
} from "../resolve"
import type { FileBrowserItemRes } from "../api-client"

const item = (over: Partial<FileBrowserItemRes>): FileBrowserItemRes => ({
  id: "id",
  name: "n",
  itemType: "File",
  parentId: null,
  options: null,
  json: null,
  fields: null,
  path: "/n",
  depth: 0,
  workspace: "w",
  ...over,
})

describe("normalizePath", () => {
  it("빈 문자열과 '/'는 루트('/')로 통일한다", () => {
    expect(normalizePath("")).toBe("/")
    expect(normalizePath("/")).toBe("/")
  })
  it("앞 슬래시를 보정하고 뒤 슬래시·공백을 제거한다", () => {
    expect(normalizePath("shop/users/")).toBe("/shop/users")
    expect(normalizePath("users/")).toBe("/users")
    expect(normalizePath("  /shop  ")).toBe("/shop")
  })
  it("연속된 슬래시를 하나로 합친다", () => {
    expect(normalizePath("//shop//users/")).toBe("/shop/users")
    expect(normalizePath("///")).toBe("/")
  })
})

describe("findItemByPath", () => {
  const items = [
    item({ id: "1", name: "shop", path: "/shop", itemType: "Folder" }),
    item({ id: "2", name: "users", path: "/shop/users" }),
  ]
  it("정규화 후 경로가 일치하는 항목을 찾는다", () => {
    expect(findItemByPath(items, "shop/users/")?.id).toBe("2")
  })
  it("후보가 하나뿐이면 대소문자를 무시하고 찾는다", () => {
    expect(findItemByPath(items, "/SHOP/USERS")?.id).toBe("2")
  })
  it("일치하는 항목이 없으면 null을 반환한다", () => {
    expect(findItemByPath(items, "/nope")).toBeNull()
  })
})

// API의 중복 검사와 unique 인덱스가 대소문자를 구분하므로 /products와
// /Products는 실제로 공존할 수 있다. 그 상태에서 임의로 하나를 고르면
// 삭제·갱신이 엉뚱한 항목에 적용되는 되돌릴 수 없는 손실이 된다.
describe("findItemByPath — 대소문자 모호성", () => {
  const ambiguous = [
    item({ id: "a", name: "products", path: "/products" }),
    item({ id: "b", name: "Products", path: "/Products" }),
  ]

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
    const single: FileBrowserItemRes[] = [ambiguous[0]!]
    expect(findItemByPath(single, "/PRODUCTS")?.id).toBe("a")
  })
})

describe("findFullItemByPath", () => {
  const light = [
    item({ id: "2", name: "users", parentId: "1", path: "/shop/users" }),
  ]

  it("경량 목록으로 id를 찾고 단건 전체를 가져온다", async () => {
    const client = {
      getItems: jest.fn().mockResolvedValue(light),
      getItem: jest
        .fn()
        .mockResolvedValue({ ...light[0], fields: [{ id: "1", name: "id", type: "number" }] }),
    }

    const itemResult = await findFullItemByPath(client as never, "/shop/users")

    expect(client.getItems).toHaveBeenCalledWith("tree")
    expect(client.getItem).toHaveBeenCalledWith("2")
    expect(itemResult?.fields).toEqual([{ id: "1", name: "id", type: "number" }])
  })

  it("경로를 찾지 못하면 단건 조회를 하지 않고 null을 반환한다", async () => {
    const client = {
      getItems: jest.fn().mockResolvedValue(light),
      getItem: jest.fn(),
    }

    expect(await findFullItemByPath(client as never, "/none")).toBeNull()
    expect(client.getItem).not.toHaveBeenCalled()
  })
})
