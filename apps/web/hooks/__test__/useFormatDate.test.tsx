import { renderHook } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import { useFormatDate } from "../useFormatDate"

/** next-intl의 포매터는 Provider 컨텍스트가 있어야 동작하므로 감싸서 렌더한다 */
const wrapper =
  (locale: string) =>
  ({ children }: { children: React.ReactNode }) => (
    <NextIntlClientProvider locale={locale} messages={{}} timeZone="UTC">
      {children}
    </NextIntlClientProvider>
  )

describe("useFormatDate", () => {
  it("ko 로케일에서 한국어 날짜 표기를 반환한다", () => {
    const { result } = renderHook(() => useFormatDate(), {
      wrapper: wrapper("ko"),
    })

    // "2026년 7월 16일" — 공백/구분자는 ICU 버전에 따라 달라질 수 있어 부분 검증한다
    const formatted = result.current("2026-07-16T12:34:56.000Z")
    expect(formatted).toContain("2026")
    expect(formatted).toContain("7")
    expect(formatted).toContain("16")
  })

  it("en 로케일에서 영어 날짜 표기를 반환한다", () => {
    const { result } = renderHook(() => useFormatDate(), {
      wrapper: wrapper("en"),
    })

    const formatted = result.current("2026-07-16T12:34:56.000Z")
    expect(formatted).toContain("Jul")
    expect(formatted).toContain("2026")
    expect(formatted).toContain("16")
  })

  it("로케일이 다르면 출력도 다르다", () => {
    const ko = renderHook(() => useFormatDate(), { wrapper: wrapper("ko") })
    const en = renderHook(() => useFormatDate(), { wrapper: wrapper("en") })

    const iso = "2026-07-16T12:34:56.000Z"
    expect(ko.result.current(iso)).not.toBe(en.result.current(iso))
  })

  it("null·undefined·빈 문자열은 빈 문자열을 반환한다", () => {
    const { result } = renderHook(() => useFormatDate(), {
      wrapper: wrapper("ko"),
    })

    expect(result.current(null)).toBe("")
    expect(result.current(undefined)).toBe("")
    expect(result.current("")).toBe("")
  })

  it("includeTime 옵션이 true일 경우 24시간제 시간(시:분:초)을 포함하여 반환한다", () => {
    const { result } = renderHook(() => useFormatDate({ includeTime: true }), {
      wrapper: wrapper("ko"),
    })

    const formatted = result.current("2026-07-16T14:30:45.000Z")
    expect(formatted).toContain("2026")
    expect(formatted).toContain("7")
    expect(formatted).toContain("16")
    expect(formatted).toContain("14")
    expect(formatted).toContain("30")
    expect(formatted).toContain("45")
  })

  it("파싱할 수 없는 날짜 문자열은 빈 문자열을 반환한다", () => {
    const { result } = renderHook(() => useFormatDate(), {
      wrapper: wrapper("ko"),
    })

    expect(result.current("invalid-date")).toBe("")
  })
})
