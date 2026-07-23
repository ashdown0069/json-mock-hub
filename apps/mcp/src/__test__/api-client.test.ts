import { ApiClient, ApiError } from "../api-client"
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
      "http://localhost:3000/ws123/filebrowser/getItems",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ "X-API-Key": "mock_test_key" }),
      })
    )
  })

  it("비-2xx 응답이면 NestJS 에러 바디의 code/message를 담은 ApiError를 던진다", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          message: { code: "auth.api_key.invalid", message: "유효하지 않은 API 키입니다." },
        }),
        { status: 401 }
      )
    )

    await expect(client.getItems()).rejects.toMatchObject({
      status: 401,
      code: "auth.api_key.invalid",
    })
  })

  it("네트워크 연결 실패면 안내 메시지를 담은 ApiError를 던진다", async () => {
    jest.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ECONNREFUSED"))

    await expect(client.getItems()).rejects.toBeInstanceOf(ApiError)
    await expect(client.getItems()).rejects.toMatchObject({ status: 0 })
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
})
