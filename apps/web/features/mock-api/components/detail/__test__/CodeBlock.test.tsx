import { render, screen, waitFor, fireEvent } from "@testing-library/react"
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
})
