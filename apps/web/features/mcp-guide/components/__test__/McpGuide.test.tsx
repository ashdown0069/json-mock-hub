import { render, screen } from "@testing-library/react"
import { McpGuide } from "../McpGuide"
import { MCP_TOOL_NAMES } from "../../data/tools"
import messages from "@/messages/ko.json"

// next-intl은 ESM 전용이라 jest(CJS 변환)가 파싱하지 못하므로 저장소 관례대로 모킹한다.
// (기존 SchemaBuilderTab.test.tsx가 next-intl을 모킹하는 것과 동일 취지)
// useTranslations는 실제 ko 메시지를 네임스페이스 기준으로 조회해, 번역 문자열 단언이 그대로 동작하게 한다.
jest.mock("next-intl", () => {
  // 팩토리는 호이스팅되므로 외부 변수 대신 내부에서 직접 require 한다.
  const koMessages = require("@/messages/ko.json")
  return {
    useTranslations: (namespace: string) => (key: string) => {
      const segments = `${namespace}.${key}`.split(".")
      let cur: unknown = koMessages
      for (const s of segments) {
        cur = (cur as Record<string, unknown> | undefined)?.[s]
      }
      return typeof cur === "string" ? cur : `${namespace}.${key}`
    },
  }
})

// CodeBlock이 내부적으로 사용하는 Shiki(ESM 전용 패키지)는 Jest 변환 대상이 아니므로 모킹한다.
// (CodeBlock.test.tsx와 동일한 패턴 재사용)
jest.mock("../../../mock-api/lib/shiki", () => ({
  getHighlighter: jest.fn().mockResolvedValue({
    codeToHtml: (code: string) => `<pre class="shiki"><code>${code}</code></pre>`,
  }),
}))

function renderGuide() {
  render(<McpGuide workspaceId="ws-xyz" apiKey="mock_test_key" />)
}

describe("McpGuide", () => {
  it("도구 표에 update_mock_api를 포함한 6개 도구 이름을 모두 렌더한다", () => {
    renderGuide()
    expect(MCP_TOOL_NAMES).toHaveLength(6)
    for (const name of MCP_TOOL_NAMES) {
      expect(screen.getByText(name)).toBeInTheDocument()
    }
  })

  it("설치 안내에 자동 주입 문구(step1)를 보여준다", () => {
    renderGuide()
    expect(
      screen.getByText(messages.WorkspaceMcp.install.step1)
    ).toBeInTheDocument()
  })
})
