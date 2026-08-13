import { buildCodeGenContext } from "../context"

const env = { baseUrl: "http://ws1.localhost:3000/api" }

describe("buildCodeGenContext", () => {
  it("이름에서 식별자와 타입명을 파생한다", () => {
    const ctx = buildCodeGenContext(
      { name: "shop-users", path: "/shop/users", schema: { id: "number" } },
      env,
    )

    expect(ctx.resourceName).toBe("shop_users")
    expect(ctx.typeName).toBe("ShopUsers")
    expect(ctx.baseUrl).toBe(env.baseUrl)
    expect(ctx.resourcePath).toBe("/shop/users")
  })

  it("path가 없으면 이름으로 경로를 만든다", () => {
    const ctx = buildCodeGenContext({ name: "users", schema: {} }, env)

    expect(ctx.resourcePath).toBe("/users")
  })

  it("schema가 없으면 빈 객체다", () => {
    const ctx = buildCodeGenContext({ name: "users" }, env)

    expect(ctx.schema).toEqual({})
  })

  it("옵션에서 파라미터명을 해석한다", () => {
    const ctx = buildCodeGenContext(
      {
        name: "users",
        path: "/users",
        options: { pagination: true, sort: true, search: true },
      },
      env,
    )

    expect(ctx.pagination).toEqual({ pageParam: "page", limitParam: "limit" })
    expect(ctx.sort).toEqual({ sortParam: "_sort", orderParam: "_order" })
    expect(ctx.search).toEqual({ searchParam: "q" })
  })

  it("옵션이 없으면 기능 3개가 모두 null이다", () => {
    const ctx = buildCodeGenContext({ name: "users", options: null }, env)

    expect(ctx.pagination).toBeNull()
    expect(ctx.sort).toBeNull()
    expect(ctx.search).toBeNull()
  })
})
