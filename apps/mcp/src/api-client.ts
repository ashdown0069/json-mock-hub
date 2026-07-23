import type {
  FieldSchema,
  MockApiOptions,
  SchemaObject,
} from "@workspace/types"
import type { McpConfig } from "./config"

// filebrowser API 응답 아이템 (apps/api/src/filebrowser/dto/res/items.ts FilebrowserItems와 동일 계약)
export interface FileBrowserItemRes {
  id: string
  name: string
  itemType: "File" | "Folder"
  parentId: string | null
  options: MockApiOptions | null
  json: unknown
  schema: SchemaObject | null
  fieldDefs: FieldSchema[] | null
  path: string
  depth: number
  workspace: string
}

// CreateItemDto(apps/api/src/filebrowser/dto/req/create-item.ts)와 동일 계약
export interface CreateItemPayload {
  name: string
  itemType: "File" | "Folder"
  parentId: string | null
  schema?: SchemaObject
  json?: unknown
  options?: MockApiOptions
  fieldDefs?: FieldSchema[]
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string | null,
    message: string
  ) {
    super(message)
    this.name = "ApiError"
  }
}

export class ApiClient {
  constructor(private readonly config: McpConfig) {}

  private get baseUrl(): string {
    return `${this.config.API_BASE_URL}/${this.config.MOCK_HUB_WORKSPACE_ID}/filebrowser`
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    let res: Response
    try {
      res = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": this.config.MOCK_HUB_API_KEY,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      })
    } catch {
      throw new ApiError(
        0,
        "network.unreachable",
        "API 서버에 연결할 수 없습니다. api 앱(포트 4001)이 실행 중인지 확인하세요 (npm run dev)."
      )
    }

    if (!res.ok) {
      // NestJS 에러 바디는 { message, code? } 또는 { message: { code, message } } 형태
      const errorBody = (await res.json().catch(() => null)) as Record<
        string,
        unknown
      > | null
      const nested = (errorBody?.message ?? errorBody) as
        | Record<string, unknown>
        | string
        | null
      const message =
        typeof nested === "string"
          ? nested
          : String(nested?.message ?? `HTTP ${res.status}`)
      const code =
        typeof nested === "object" &&
        nested !== null &&
        typeof nested.code === "string"
          ? nested.code
          : null
      throw new ApiError(res.status, code, message)
    }

    return (await res.json()) as T
  }

  getItems(): Promise<FileBrowserItemRes[]> {
    return this.request("GET", "/getItems")
  }

  // 생성 응답은 Serialize 미적용 mongoose 문서 원본이므로 _id 필드를 갖는다
  createItem(
    payload: CreateItemPayload
  ): Promise<{ _id: string; path: string }> {
    return this.request("POST", "/createItem", payload)
  }

  updateItem(
    payload: CreateItemPayload & { itemId: string }
  ): Promise<{ isSuccess: boolean }> {
    return this.request("PUT", "", payload)
  }

  // RenameItemDto: { workspaceId, itemId, newName } — 이름 변경은 path 재계산이 필요해 전용 엔드포인트 사용
  renameItem(itemId: string, newName: string): Promise<{ isSuccess: boolean }> {
    return this.request("PATCH", "/renameItem", {
      workspaceId: this.config.MOCK_HUB_WORKSPACE_ID,
      itemId,
      newName,
    })
  }

  deleteItems(itemIds: string[]): Promise<{ isSuccess: boolean }> {
    return this.request("DELETE", "", { itemIds })
  }
}
