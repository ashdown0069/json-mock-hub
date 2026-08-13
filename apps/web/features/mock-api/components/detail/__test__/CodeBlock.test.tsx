import { render, screen, waitFor, fireEvent, act } from "@testing-library/react"
import { CodeBlock } from "../CodeBlock"

// next-intl은 ESM 전용이라 jest(CJS 변환)가 파싱하지 못하므로 저장소 관례대로 모킹한다.
// (기존 SchemaBuilderTab.test.tsx가 next-intl을 모킹하는 것과 동일 취지)
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}))

// Shiki 하이라이터 싱글턴을 가상 모킹하여 비동기 하이라이트 작동을 검증합니다.
jest.mock("../../../lib/shiki", () => ({
  getHighlighter: jest.fn().mockResolvedValue({
    codeToHtml: (code: string) =>
      `<pre class="shiki"><code>${code.replace(/</g, "&lt;")}</code></pre>`,
  }),
}))

describe("CodeBlock 렌더링", () => {
  beforeAll(() => {
    // navigator.clipboard API 모킹
    Object.assign(navigator, {
      clipboard: { writeText: jest.fn().mockResolvedValue(undefined) },
    })
  })

  it("하이라이트된 코드가 비동기로 렌더링된다", async () => {
    render(<CodeBlock code={'{"a":1}'} lang="json" />)
    await waitFor(() => {
      expect(document.querySelector(".shiki")).toBeInTheDocument()
    })
  })

  it("복사 버튼 클릭 시 원본 코드가 클립보드에 복사된다", async () => {
    render(<CodeBlock code={'{"a":1}'} lang="json" />)
    fireEvent.click(screen.getByRole("button", { name: "코드 복사" }))
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('{"a":1}')
    })
  })

  it("셸 스니펫도 shellscript 언어로 렌더링한다", async () => {
    render(<CodeBlock code={"claude mcp add --scope local"} lang="shellscript" />)
    await waitFor(() => {
      expect(document.querySelector(".shiki")).toBeInTheDocument()
    })
  })

  it("복사 직후 언마운트되면 대기 중이던 리셋 타이머가 정리된다", async () => {
    // 주의: 기본(modern/sinon 기반) 페이크 타이머를 쓰면 React 19 Scheduler가
    // 내부적으로 등록하는, 컴포넌트 로직과 무관한 타이머가 jest.getTimerCount()에
    // 함께 잡혀 언제나 1개가 남는다(빈 컴포넌트로 재현 확인됨). legacy 모드는
    // Node의 원시 타이머 함수만 페이크로 바꾸고 Scheduler의 내부 메커니즘은
    // 건드리지 않으므로, 여기서는 legacy 모드로 우리 컴포넌트의 타이머만 측정한다.
    jest.useFakeTimers({ legacyFakeTimers: true })
    const { unmount } = render(<CodeBlock code={'{"a":1}'} lang="json" />)

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "코드 복사" }))
    })

    // 복사 성공 → 1.5초 뒤 아이콘을 되돌리는 타이머가 예약된 상태
    expect(jest.getTimerCount()).toBeGreaterThan(0)

    unmount()

    // 언마운트되면 예약된 타이머가 남아 있어서는 안 된다
    expect(jest.getTimerCount()).toBe(0)
    jest.useRealTimers()
  })
})
