import { renderHook, act } from "@testing-library/react"
import { useBoolean, useCopyToClipboard, useTimeout } from "usehooks-ts"

/**
 * usehooks-ts가 jest(CJS 변환) 환경에서 로드·실행 가능한지 감시하는 회귀 테스트.
 *
 * 이 저장소는 next-intl처럼 ESM 전용 패키지를 테스트마다 모킹해 우회해 왔다.
 * usehooks-ts에도 같은 문제가 생기면 이 파일이 가장 먼저 깨져 원인을 즉시 알려준다.
 * 실제 사용처 테스트가 따로 있으므로 여기서는 로딩과 최소 동작만 확인한다.
 */
describe("usehooks-ts 로딩", () => {
  it("useBoolean을 import해 상태를 토글할 수 있다", () => {
    const { result } = renderHook(() => useBoolean(false))

    expect(result.current.value).toBe(false)
    act(() => result.current.setTrue())
    expect(result.current.value).toBe(true)
    act(() => result.current.toggle())
    expect(result.current.value).toBe(false)
  })

  it("useCopyToClipboard가 [값, 복사함수] 튜플을 반환한다", () => {
    const { result } = renderHook(() => useCopyToClipboard())

    const [copiedText, copy] = result.current
    expect(copiedText).toBeNull()
    expect(typeof copy).toBe("function")
  })

  it("useTimeout의 delay가 null이면 타이머를 예약하지 않는다", () => {
    jest.useFakeTimers()
    const callback = jest.fn()

    renderHook(() => useTimeout(callback, null))

    jest.advanceTimersByTime(10_000)
    expect(callback).not.toHaveBeenCalled()
    jest.useRealTimers()
  })
})
