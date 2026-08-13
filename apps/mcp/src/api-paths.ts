/**
 * MCP가 호출하는 API 경로의 단일 원천 (워크스페이스 루트 기준 상대 경로).
 *
 * 이 상수는 apps/api의 라우트 정의와 맺은 계약이다. apps/api가 경로를 바꿔도
 * MCP는 컴파일되고 단위 테스트도 통과하면서 런타임에만 404가 난다.
 * apps/api 쪽 라우트 계약 스펙이 이 파일을 직접 읽어 실제 Nest 라우트
 * 메타데이터와 대조하므로, 경로를 바꿀 때는 반드시 여기만 고친다.
 */
export const API_PATHS = {
  getItems: (view: "tree" | "full") =>
    view === "tree" ? "/filebrowser/getItems?view=tree" : "/filebrowser/getItems",
  getItem: (itemId: string) => `/filebrowser/items/${itemId}`,
  createItem: "/filebrowser/createItem",
  updateItem: "/filebrowser",
  renameItem: "/filebrowser/renameItem",
  moveItems: "/filebrowser/moveItems",
  deleteItems: "/filebrowser",
  resetMockState: "/filebrowser/resetMockState",
  effectiveJson: "/mockstate/effective",
} as const
