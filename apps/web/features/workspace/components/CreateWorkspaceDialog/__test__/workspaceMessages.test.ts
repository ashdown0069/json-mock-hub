import en from "../../../../../messages/en.json"
import ko from "../../../../../messages/ko.json"

// en/ko의 Workspaces 네임스페이스가 동일한 키 집합을 갖는지, 그리고
// 다이얼로그 및 관련 컴포넌트가 참조할 필수 키가 모두 존재하는지 검증한다.
describe("Workspaces 메시지 카탈로그", () => {
  const REQUIRED_KEYS = [
    "title",
    "createWorkspace",
    "cancel",
    "loading",
    "loadError",
    "emptyTitle",
    "emptyDescription",
    "createError",
    "create",
    "error",
  ]

  it("en과 ko의 Workspaces 최상위 키 집합이 완전히 동일하다", () => {
    const enKeys = Object.keys(
      (en as Record<string, unknown>).Workspaces as object
    ).sort()
    const koKeys = Object.keys(
      (ko as Record<string, unknown>).Workspaces as object
    ).sort()
    expect(enKeys).toEqual(koKeys)
  })

  it("워크스페이스 생성 다이얼로그가 참조하는 필수 키(cancel 포함)가 en/ko 모두에 존재한다", () => {
    for (const key of REQUIRED_KEYS) {
      expect((en as Record<string, unknown>).Workspaces).toHaveProperty(key)
      expect((ko as Record<string, unknown>).Workspaces).toHaveProperty(key)
    }
  })
})
