import { buildCodeGenContext } from "../context"

const env = { baseUrl: "http://ws1.localhost:3000/api" }

describe("buildCodeGenContext", () => {
  it("이름에서 식별자와 타입명을 파생한다", () => {
    const ctx = buildCodeGenContext(
      {
        name: "shop-users",
        path: "/shop/users",
        fields: [{ id: "1", name: "id", type: "number", fakerMethod: "none" }],
      },
      env,
    )

    expect(ctx.resourceName).toBe("shop_users")
    expect(ctx.typeName).toBe("ShopUsers")
    expect(ctx.baseUrl).toBe(env.baseUrl)
    expect(ctx.resourcePath).toBe("/shop/users")
  })

  it("path가 없으면 이름으로 경로를 만든다", () => {
    const ctx = buildCodeGenContext({ name: "users", fields: [] }, env)

    expect(ctx.resourcePath).toBe("/users")
  })

  it("fields가 없거나 빈 배열이면 빈 객체다", () => {
    const ctx1 = buildCodeGenContext({ name: "users" }, env)
    expect(ctx1.schema).toEqual({})

    const ctx2 = buildCodeGenContext({ name: "users", fields: [] }, env)
    expect(ctx2.schema).toEqual({})
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

  describe("SSOT 및 schema 파생 규칙", () => {
    it("fields가 제공되면 컬렉션 모드에서 id: 'number'를 최상위에 자동 주입한다", () => {
      const ctx = buildCodeGenContext(
        {
          name: "products",
          options: { resourceType: "collection", pagination: false },
          fields: [
            { id: "1", name: "title", type: "string", fakerMethod: "none" },
            { id: "2", name: "price", type: "number", fakerMethod: "none" },
          ],
        },
        env,
      )

      expect(ctx.schema).toEqual({
        id: "number",
        title: "string",
        price: "number",
      })
      expect(Object.keys(ctx.schema)[0]).toBe("id")
    })

    it("단일 객체(object) 모드에서는 시스템 id를 강제 주입하지 않는다", () => {
      const ctx = buildCodeGenContext(
        {
          name: "settings",
          options: { resourceType: "object", pagination: false },
          fields: [
            { id: "1", name: "theme", type: "string", fakerMethod: "none" },
          ],
        },
        env,
      )

      expect(ctx.schema).toEqual({
        theme: "string",
      })
      expect(ctx.schema).not.toHaveProperty("id")
    })

    it("중첩 객체(object) 및 배열(array) 구조를 올바르게 SchemaObject로 변환한다", () => {
      const ctx = buildCodeGenContext(
        {
          name: "complex",
          options: { resourceType: "object", pagination: false },
          fields: [
            {
              id: "1",
              name: "user",
              type: "object",
              fields: [
                { id: "1-1", name: "name", type: "string", fakerMethod: "none" },
              ],
            },
            {
              id: "2",
              name: "tags",
              type: "array",
              arrayItemType: "string",
            },
          ],
        },
        env,
      )

      expect(ctx.schema).toEqual({
        user: { name: "string" },
        tags: { type: "array", items: "string" },
      })
    })
  })
})
