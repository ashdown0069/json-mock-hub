import { renderHook } from "@testing-library/react"
import { toast } from "sonner"
import { useApiErrorHandler } from "../useApiErrorHandler"

// sonner 토스트 목
jest.mock("sonner", () => ({ toast: { error: jest.fn() } }))

// next-intl useTranslations를 실제 ko 메시지의 errors 네임스페이스로 흉내(+ t.has)
jest.mock("next-intl", () => {
  const errors = require("@/messages/ko.json").errors
  const get = (key: string) =>
    key.split(".").reduce((o: any, k: string) => o?.[k], errors)
  const make = () => {
    const t = (key: string) => {
      const v = get(key)
      return typeof v === "string" ? v : key
    }
    ;(t as any).has = (key: string) => typeof get(key) === "string"
    return t
  }
  return { useTranslations: () => make() }
})

const mockToast = toast.error as jest.Mock

function err(code?: string, message?: string) {
  return { response: { data: { code, message } } } as any
}

describe("useApiErrorHandler", () => {
  beforeEach(() => jest.clearAllMocks())

  it("매핑된 코드는 로케일별 구체 메시지를 토스트한다", () => {
    const { result } = renderHook(() => useApiErrorHandler())
    result.current(err("workspace.permission.denied", "무시될 raw"))
    expect(mockToast).toHaveBeenCalledWith(
      "이 작업을 수행할 권한이 없습니다.",
      { position: "top-center" }
    )
  })

  it("미매핑 코드는 API raw message가 아니라 generic(requestFailed)으로 폴백한다", () => {
    const { result } = renderHook(() => useApiErrorHandler())
    result.current(err("some.unmapped.code", "서버가 준 한국어 메시지"))
    expect(mockToast).toHaveBeenCalledWith(
      "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      { position: "top-center" }
    )
  })

  it("defaultMsg 옵션이 있으면 미매핑 시 그 값을 쓴다", () => {
    const { result } = renderHook(() => useApiErrorHandler())
    result.current(err(undefined, "raw"), { defaultMsg: "생성에 실패했습니다." })
    expect(mockToast).toHaveBeenCalledWith("생성에 실패했습니다.", {
      position: "top-center",
    })
  })

  it("showToast:false면 토스트하지 않고 onHandled로 message/code를 넘긴다", () => {
    const onHandled = jest.fn()
    const { result } = renderHook(() => useApiErrorHandler())
    result.current(err("workspace.join.password_mismatch"), {
      showToast: false,
      onHandled,
    })
    expect(mockToast).not.toHaveBeenCalled()
    expect(onHandled).toHaveBeenCalledWith(
      "워크스페이스 비밀번호가 일치하지 않습니다.",
      "workspace.join.password_mismatch"
    )
  })
})

import ko from "@/messages/ko.json"
import en from "@/messages/en.json"

// API(apps/api)가 실제로 던지는 에러 code 목록 — 새 코드 추가 시 이 배열도 갱신할 것
const API_ERROR_CODES = [
  "auth.api_key.invalid",
  "auth.login.invalid_credentials",
  "auth.signup.email_exists",
  "auth.unauthorized",
  "workspace.access.not_found",
  "workspace.access.not_member",
  "workspace.access.owner_only",
  "workspace.join.not_found",
  "workspace.join.password_mismatch",
  "workspace.permission.denied",
]

const hasKey = (msgs: any, code: string) =>
  typeof code.split(".").reduce((o: any, k: string) => o?.[k], msgs.errors) ===
  "string"

describe("API 에러 코드 i18n 매핑 가드", () => {
  it.each(API_ERROR_CODES)("%s 는 ko/en 모두 매핑돼 있다", (code) => {
    expect(hasKey(ko, code)).toBe(true)
    expect(hasKey(en, code)).toBe(true)
  })
})
