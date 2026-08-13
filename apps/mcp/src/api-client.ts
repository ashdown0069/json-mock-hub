import type {
  FieldSchema,
  FileBrowserItemContract,
  MockApiOptions,
  SchemaObject,
} from "@workspace/types"
import type { McpConfig } from "./config"
import { API_PATHS } from "./api-paths"

// 계약은 @workspace/types가 단독 소유한다. 이름만 기존 호출부에 맞춰 유지한다.
export type FileBrowserItemRes = FileBrowserItemContract

// CreateItemDto(apps/api/src/filebrowser/dto/req/create-item.ts)와 동일 계약
interface CreateItemPayload {
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

/** API가 트랜잭션에 걸리면 도구 호출이 영구 pending이 되어 대화 세션이 멈춘다. */
const REQUEST_TIMEOUT_MS = 15_000

export class ApiClient {
  constructor(private readonly config: McpConfig) {}

  /**
   * 워크스페이스 루트. filebrowser 외 mockstate 컨트롤러도 이 아래에 있으므로
   * 컨트롤러 세그먼트는 각 메서드가 API_PATHS에서 가져와 붙인다.
   */
  private get baseUrl(): string {
    return `${this.config.API_BASE_URL}/${this.config.MOCK_HUB_WORKSPACE_ID}`
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
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
    } catch (error) {
      // AbortSignal.timeout은 TimeoutError, 수동 abort는 AbortError를 던진다
      const name = error instanceof Error ? error.name : ""
      if (name === "TimeoutError" || name === "AbortError") {
        throw new ApiError(
          0,
          "network.timeout",
          `API 서버가 ${REQUEST_TIMEOUT_MS / 1000}초 안에 응답하지 않았습니다. 서버 상태를 확인하고 다시 시도하세요.`
        )
      }
      throw new ApiError(
        0,
        "network.unreachable",
        "API 서버에 연결할 수 없습니다. api 앱(포트 4001)이 실행 중인지 확인하세요 (npm run dev)."
      )
    }

    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as Record<
        string,
        unknown
      > | null
      const { code, message } = parseErrorBody(res.status, body)
      throw new ApiError(res.status, code, message)
    }

    return (await res.json()) as T
  }

  /**
   * 항목 목록.
   * 기본은 경량 뷰(view=tree) — 대부분의 도구는 경로와 id만 필요한데
   * 전체 뷰는 mock json 원본(파일당 최대 100KB)까지 매번 내려받는다.
   */
  getItems(view: "tree" | "full" = "tree"): Promise<FileBrowserItemRes[]> {
    return this.request("GET", API_PATHS.getItems(view))
  }

  /** 단건 전체 조회 — 경량 목록에서 제외된 schema/json/fieldDefs를 가져온다. */
  getItem(itemId: string): Promise<FileBrowserItemRes> {
    return this.request("GET", API_PATHS.getItem(itemId))
  }

  // 생성 응답은 Serialize 미적용 mongoose 문서 원본이므로 _id 필드를 갖는다
  createItem(
    payload: CreateItemPayload
  ): Promise<CreatedItemResponse> {
    return this.request("POST", API_PATHS.createItem, payload)
  }

  updateItem(
    payload: CreateItemPayload & { itemId: string }
  ): Promise<{ isSuccess: boolean }> {
    return this.request("PUT", API_PATHS.updateItem, payload)
  }

  // RenameItemDto: { workspaceId, itemId, newName } — 이름 변경은 path 재계산이 필요해 전용 엔드포인트 사용
  renameItem(itemId: string, newName: string): Promise<{ isSuccess: boolean }> {
    return this.request("PATCH", API_PATHS.renameItem, {
      workspaceId: this.config.MOCK_HUB_WORKSPACE_ID,
      itemId,
      newName,
    })
  }

  // MoveItemsDto: { workspaceId, dragIds, parentId } — 단일 항목만 다루므로 dragIds는 항상 길이 1
  moveItem(itemId: string, parentId: string | null): Promise<{ isSuccess: boolean }> {
    return this.request("PATCH", API_PATHS.moveItems, {
      workspaceId: this.config.MOCK_HUB_WORKSPACE_ID,
      dragIds: [itemId],
      parentId,
    })
  }

  deleteItems(itemIds: string[]): Promise<{ isSuccess: boolean }> {
    return this.request("DELETE", API_PATHS.deleteItems, { itemIds })
  }

  /**
   * 저장된 mock JSON에 Redis 오버레이(CUD 조작 결과)가 반영된 런타임 실효 데이터.
   * 컨트롤러가 GET :workspaceId/mockstate/effective?path=... 형태로 받아 배열로 반환한다.
   */
  getEffectiveJson(path: string): Promise<unknown[]> {
    const encoded = encodeURIComponent(path)
    return this.request("GET", `${API_PATHS.effectiveJson}?path=${encoded}`)
  }

  /**
   * mock API의 런타임 오버레이(CUD 변경 이력)를 초기화해 원본 mock JSON으로 복원한다.
   * POST :workspaceId/filebrowser/resetMockState, body: { itemId }
   */
  resetMockState(itemId: string): Promise<{ success: true }> {
    return this.request("POST", API_PATHS.resetMockState, { itemId })
  }
}

const pickString = (value: unknown): string | null =>
  typeof value === "string" ? value : null

/**
 * apps/api가 실제로 만드는 에러 바디를 파싱한다.
 *
 * - 전역 예외 필터:  { statusCode, code, message, details? }
 * - ValidationPipe:  { statusCode, message: string[], error }   (필터 도입 전 응답 호환)
 * - 서비스 중복 이름: { message, key: "duplicate" }
 * - 문자열 예외:     { statusCode, message: "Item not found" }
 *
 * 이전 구현은 어디서도 만들어지지 않는 { message: { code, message } }를 가정해
 * code가 항상 null이었고, 배열 메시지는 "HTTP 400"으로 전멸했다.
 */
function parseErrorBody(
  status: number,
  body: Record<string, unknown> | null
): { code: string | null; message: string } {
  if (!body) return { code: null, message: `HTTP ${status}` }

  const raw = body.message
  const nested = (typeof raw === "object" && raw !== null ? raw : null) as
    | Record<string, unknown>
    | null

  const message = Array.isArray(raw)
    ? raw.map(String).join(" / ")
    : pickString(raw) ?? pickString(nested?.message) ?? `HTTP ${status}`

  const code =
    pickString(body.code) ?? pickString(body.key) ?? pickString(nested?.code)

  // LLM 컨텍스트를 지나치게 소모하지 않도록 상한을 둔다
  return { code, message: message.slice(0, 500) }
}
