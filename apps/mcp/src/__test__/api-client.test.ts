import { ApiClient } from "../api-client"
import type { McpConfig } from "../config"

describe("ApiClient", () => {
  const config: McpConfig = {
    API_BASE_URL: "http://localhost:3000",
    MOCK_DOMAIN: "localhost:3000",
    MOCK_HUB_API_KEY: "mock_test_key",
    MOCK_HUB_WORKSPACE_ID: "ws123",
  }
  const client = new ApiClient(config)

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("X-API-Key 헤더를 실어 워크스페이스 filebrowser 경로를 호출한다", async () => {
    const fetchMock = jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify([]), { status: 200 })
    )

    await client.getItems()

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/ws123/filebrowser/getItems?view=tree",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ "X-API-Key": "mock_test_key" }),
      })
    )
  })

  describe("실제 API가 만드는 에러 바디를 파싱한다", () => {
    const respondWith = (body: unknown, status: number) => {
      jest
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(new Response(JSON.stringify(body), { status }))
    }

    it("전역 예외 필터의 { statusCode, code, message } 형태", async () => {
      respondWith(
        {
          statusCode: 403,
          code: "workspace.permission.denied",
          message: "이 작업을 수행할 권한이 없습니다.",
        },
        403
      )

      await expect(client.getItems()).rejects.toMatchObject({
        status: 403,
        code: "workspace.permission.denied",
        message: "이 작업을 수행할 권한이 없습니다.",
      })
    })

    it("ValidationPipe의 message 배열을 합쳐 상세를 보존한다", async () => {
      respondWith(
        {
          statusCode: 400,
          message: ["이름은 한글, 영문, 숫자만 사용할 수 있습니다.", "itemType 오류"],
          error: "Bad Request",
        },
        400
      )

      const error = await client.getItems().catch((e) => e)
      expect(error.status).toBe(400)
      expect(error.message).toContain("이름은 한글")
      expect(error.message).toContain("itemType 오류")
      expect(error.message).not.toBe("HTTP 400")
    })

    it("중복 이름의 { message, key } 형태에서 key를 code로 읽는다", async () => {
      respondWith({ message: "File name already exists", key: "duplicate" }, 400)

      await expect(client.getItems()).rejects.toMatchObject({
        code: "duplicate",
        message: "File name already exists",
      })
    })

    it("statusCode + 문자열 message만 있는 형태", async () => {
      respondWith({ statusCode: 404, message: "Item not found" }, 404)

      await expect(client.getItems()).rejects.toMatchObject({
        status: 404,
        code: null,
        message: "Item not found",
      })
    })

    it("JSON이 아닌 응답이면 HTTP 상태로 폴백한다", async () => {
      jest
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(new Response("<html>502 Bad Gateway</html>", { status: 502 }))

      await expect(client.getItems()).rejects.toMatchObject({
        status: 502,
        code: null,
        message: "HTTP 502",
      })
    })

    it("지나치게 긴 메시지는 500자로 자른다", async () => {
      respondWith({ statusCode: 400, message: "가".repeat(2000) }, 400)

      const error = await client.getItems().catch((e) => e)
      expect(error.message.length).toBe(500)
    })
  })

  describe("ApiClient 요청 타임아웃", () => {
    it("fetch에 AbortSignal을 전달한다", async () => {
      const fetchSpy = jest
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }))

      await client.getItems()

      expect(fetchSpy.mock.calls[0]?.[1]).toEqual(
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      )
    })

    it("중단(AbortError) 시 network.timeout 코드를 담은 ApiError를 던진다", async () => {
      const abortError = new Error("The operation was aborted")
      abortError.name = "TimeoutError"
      jest.spyOn(globalThis, "fetch").mockRejectedValue(abortError)

      await expect(client.getItems()).rejects.toMatchObject({
        status: 0,
        code: "network.timeout",
      })
    })

    it("그 외 네트워크 실패는 network.unreachable을 유지한다", async () => {
      jest.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ECONNREFUSED"))

      await expect(client.getItems()).rejects.toMatchObject({
        status: 0,
        code: "network.unreachable",
      })
    })
  })

  it("createItem 호출 시 POST 메서드와 body 페이로드를 전달한다", async () => {
    const fetchMock = jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ _id: "new_id", path: "/mock" }), { status: 201 })
    )

    const payload = {
      name: "test-api",
      itemType: "File" as const,
      parentId: null,
    }
    const result = await client.createItem(payload)

    expect(result).toEqual({ _id: "new_id", path: "/mock" })
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/ws123/filebrowser/createItem",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(payload),
      })
    )
  })

  it("deleteItems 호출 시 DELETE 메서드와 itemIds를 body 페이로드로 전달한다", async () => {
    const fetchMock = jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ isSuccess: true }), { status: 200 })
    )

    const result = await client.deleteItems(["item_1", "item_2"])

    expect(result).toEqual({ isSuccess: true })
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/ws123/filebrowser",
      expect.objectContaining({
        method: "DELETE",
        body: JSON.stringify({ itemIds: ["item_1", "item_2"] }),
      })
    )
  })

  it("moveItem 호출 시 PATCH 메서드와 dragIds/parentId를 body로 전달한다", async () => {
    const fetchMock = jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ isSuccess: true }), { status: 200 })
    )

    const result = await client.moveItem("item_1", "folder_1")

    expect(result).toEqual({ isSuccess: true })
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/ws123/filebrowser/moveItems",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          workspaceId: "ws123",
          dragIds: ["item_1"],
          parentId: "folder_1",
        }),
      })
    )
  })

  it("parentId가 null이면 루트로 이동 요청을 보낸다", async () => {
    const fetchMock = jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ isSuccess: true }), { status: 200 })
    )

    await client.moveItem("item_1", null)

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          workspaceId: "ws123",
          dragIds: ["item_1"],
          parentId: null,
        }),
      })
    )
  })

  describe("ApiClient 목록·단건 조회", () => {
    it("기본 getItems는 view=tree로 경량 목록을 요청한다", async () => {
      const fetchSpy = jest
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }))

      await client.getItems()

      expect(fetchSpy.mock.calls[0]?.[0]).toContain("view=tree")
    })

    it("view=full을 명시하면 전체 목록을 요청한다", async () => {
      const fetchSpy = jest
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }))

      await client.getItems("full")

      expect(fetchSpy.mock.calls[0]?.[0]).not.toContain("view=tree")
    })

    it("getItem은 단건 엔드포인트를 호출한다", async () => {
      const fetchSpy = jest
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(
          new Response(JSON.stringify({ id: "abc" }), { status: 200 })
        )

      await client.getItem("abc")

      expect(fetchSpy.mock.calls[0]?.[0]).toContain("/items/abc")
    })
  })

  describe("ApiClient mockstate·resetMockState", () => {
    it("getEffectiveJson은 mockstate/effective를 path 쿼리와 함께 호출한다", async () => {
      const fetchMock = jest
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(
          new Response(JSON.stringify([{ id: 1 }]), { status: 200 })
        )

      const result = await client.getEffectiveJson("/shop/users")

      expect(result).toEqual([{ id: 1 }])
      expect(fetchMock.mock.calls[0]?.[0]).toBe(
        "http://localhost:3000/ws123/mockstate/effective?path=%2Fshop%2Fusers"
      )
    })

    it("resetMockState는 filebrowser/resetMockState로 itemId를 POST한다", async () => {
      const fetchMock = jest
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(
          new Response(JSON.stringify({ success: true }), { status: 201 })
        )

      const result = await client.resetMockState("item_1")

      expect(result).toEqual({ success: true })
      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:3000/ws123/filebrowser/resetMockState",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ itemId: "item_1" }),
        })
      )
    })
  })
})
