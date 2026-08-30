import en from "../messages/en.json"
import ko from "../messages/ko.json"

// JSON 객체 평탄화
// 예: { a: { b: "v" } } → ["a.b"]
function flattenKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  const keys: string[] = []
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      keys.push(...flattenKeys(value as Record<string, unknown>, path))
    } else {
      keys.push(path)
    }
  }
  return keys.sort()
}

// dot-notation 경로로 중첩 프로퍼티 존재 여부 확인
// 예: hasNestedProperty(obj, "error.invalidEmail")
function hasNestedProperty(obj: unknown, path: string): boolean {
  return typeof path.split(".").reduce((acc: any, part: string) => acc?.[part], obj) === "string"
}

describe("i18n 키 동기화 (전체 네임스페이스)", () => {
  // en과 ko의 최상위 네임스페이스가 동일한지 먼저 검증한다.
  // 새 네임스페이스가 한쪽에만 추가되면 이 테스트가 즉시 실패한다.
  it("en과 ko의 최상위 네임스페이스 목록이 동일하다", () => {
    const enNamespaces = Object.keys(en).sort()
    const koNamespaces = Object.keys(ko).sort()
    expect(enNamespaces).toEqual(koNamespaces)
  })

  // 각 네임스페이스 내부의 모든 키(중첩 포함)를 재귀적으로 비교한다.
  const namespaces = Object.keys(en)
  it.each(namespaces)(
    "%s — en과 ko의 전체 키(중첩 포함)가 동일하다",
    (ns) => {
      const enKeys = flattenKeys(
        (en as Record<string, unknown>)[ns] as Record<string, unknown>
      )
      const koKeys = flattenKeys(
        (ko as Record<string, unknown>)[ns] as Record<string, unknown>
      )

      // en에만 있는 키 (ko에 번역 누락)
      const missingInKo = enKeys.filter((k) => !koKeys.includes(k))
      // ko에만 있는 키 (en에 번역 누락 또는 불필요한 키)
      const missingInEn = koKeys.filter((k) => !enKeys.includes(k))

      // 실패 시 어떤 키가 누락됐는지 명확히 보여준다
      expect(missingInKo).toEqual([])
      expect(missingInEn).toEqual([])
    }
  )
})

describe("MockApiDialog 필수 키 검증", () => {
  const REQUIRED_KEYS = [
    "titleCreate",
    "titleEdit",
    "endpointDetails",
    "apiPath",
    "apiPathPlaceholder",
    "submitCreate",
    "submitEdit",
    "cancel",
    "dataSchema",
    "addField",
    "fieldNamePlaceholder",
    "fakerMethodPlaceholder",
    "fakerNone",
    "emptyFields",
    "generationOptions",
    "mockItems",
    "itemsCount",
    "apiFeatures",
    "paginationMetadata",
    "pageParam",
    "limitParam",
    "pageParamPlaceholder",
    "limitParamPlaceholder",
    "sortFeature",
    "sortParam",
    "orderParam",
    "sortParamPlaceholder",
    "orderParamPlaceholder",
    "searchFeature",
    "searchParam",
    "searchParamPlaceholder",
  ]

  it("다이얼로그가 참조하는 필수 키가 en/ko 모두에 존재한다", () => {
    for (const key of REQUIRED_KEYS) {
      expect((en as Record<string, any>).MockApiDialog).toHaveProperty(key)
      expect((ko as Record<string, any>).MockApiDialog).toHaveProperty(key)
    }
  })

  it("ko의 titleCreate/titleEdit는 영어 원문이 아니다(번역 완료)", () => {
    expect((ko as Record<string, any>).MockApiDialog.titleCreate).not.toBe("New Mock API")
    expect((ko as Record<string, any>).MockApiDialog.titleEdit).not.toBe("Edit Mock API")
  })
})

describe("Workspaces 필수 키 검증", () => {
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

  it("워크스페이스 관련 컴포넌트가 참조하는 필수 키가 en/ko 모두에 존재한다", () => {
    for (const key of REQUIRED_KEYS) {
      expect((en as Record<string, any>).Workspaces).toHaveProperty(key)
      expect((ko as Record<string, any>).Workspaces).toHaveProperty(key)
    }
  })
})

describe("인증 & 폼 검증 스키마 필수 키", () => {
  it("SignupPage 회원가입 스키마 및 폼 필수 키가 존재한다", () => {
    const REQUIRED = [
      "title",
      "email",
      "nickname",
      "password",
      "confirmPassword",
      "submit",
      "signIn",
      "error.invalidEmail",
      "error.nicknameRequired",
      "error.nicknameMin",
      "error.passwordMin",
      "error.passwordNotMatch",
    ]
    for (const key of REQUIRED) {
      expect(hasNestedProperty((en as any).SignupPage, key)).toBe(true)
      expect(hasNestedProperty((ko as any).SignupPage, key)).toBe(true)
    }
  })

  it("LandingPage 로그인 스키마 및 폼 필수 키가 존재한다", () => {
    const REQUIRED = ["email", "password", "signIn", "invalidEmail", "passwordRequired"]
    for (const key of REQUIRED) {
      expect((en as any).LandingPage).toHaveProperty(key)
      expect((ko as any).LandingPage).toHaveProperty(key)
    }
  })

  it("JoinWorkspace 워크스페이스 참여 폼 필수 키가 존재한다", () => {
    const REQUIRED = [
      "title",
      "passwordLabel",
      "passwordPlaceholder",
      "passwordRequired",
      "submit",
      "joinSuccess",
    ]
    for (const key of REQUIRED) {
      expect((en as any).JoinWorkspace).toHaveProperty(key)
      expect((ko as any).JoinWorkspace).toHaveProperty(key)
    }
  })
})

describe("API 에러 코드 & 시스템 공통 에러 필수 키", () => {
  const API_ERROR_CODES = [
    "auth.api_key.invalid",
    "auth.login.invalid_credentials",
    "auth.signup.email_exists",
    "auth.unauthorized",
    "auth.common.access_denied",
    "workspace.access.not_found",
    "workspace.access.not_member",
    "workspace.access.owner_only",
    "workspace.join.not_found",
    "workspace.join.password_mismatch",
    "workspace.permission.denied",
  ]

  it.each(API_ERROR_CODES)("서버 에러 코드 '%s' 매핑이 en/ko 모두에 존재한다", (code) => {
    expect(hasNestedProperty((en as any).errors, code)).toBe(true)
    expect(hasNestedProperty((ko as any).errors, code)).toBe(true)
  })

  it("공통 시스템 메시지 키가 존재한다", () => {
    const COMMON_KEYS = ["duplicate", "itemNameRule", "idFieldReserved", "copyFailed", "requestFailed"]
    for (const key of COMMON_KEYS) {
      expect((en as any).errors).toHaveProperty(key)
      expect((ko as any).errors).toHaveProperty(key)
    }
  })
})

describe("주요 다이얼로그 & 전역 에러 필수 키", () => {
  it("WorkspaceSettings 멤버 추방 다이얼로그 필수 키가 존재한다", () => {
    const REQUIRED = ["removeDialogTitle", "removeDialogDescription", "removeConfirm", "cancel", "removeSuccess"]
    for (const key of REQUIRED) {
      expect((en as any).WorkspaceSettings.members).toHaveProperty(key)
      expect((ko as any).WorkspaceSettings.members).toHaveProperty(key)
    }
  })

  it("EndpointList Mock 상태 초기화 다이얼로그 필수 키가 존재한다", () => {
    const REQUIRED = ["resetConfirmTitle", "resetConfirmDesc", "resetConfirm", "cancel", "resetSuccess"]
    for (const key of REQUIRED) {
      expect((en as any).EndpointList).toHaveProperty(key)
      expect((ko as any).EndpointList).toHaveProperty(key)
    }
  })

  it("WorkspaceMcp API 키 재발급 다이얼로그 필수 키가 존재한다", () => {
    const REQUIRED = ["reissueDialogTitle", "reissueDialogDescription", "reissueConfirm", "cancel", "reissueSuccess"]
    for (const key of REQUIRED) {
      expect((en as any).WorkspaceMcp.apiKey).toHaveProperty(key)
      expect((ko as any).WorkspaceMcp.apiKey).toHaveProperty(key)
    }
  })

  it("Error 전역 에러 바운더리 및 404 필수 키가 존재한다", () => {
    const REQUIRED = ["title", "description", "retry", "notFoundTitle", "notFoundDescription", "backHome"]
    for (const key of REQUIRED) {
      expect((en as any).Error).toHaveProperty(key)
      expect((ko as any).Error).toHaveProperty(key)
    }
  })
})
