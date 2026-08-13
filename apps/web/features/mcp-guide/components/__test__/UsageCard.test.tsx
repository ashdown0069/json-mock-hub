import { render, screen } from "@testing-library/react"
import { UsageCard } from "../UsageCard"
import { MCP_TOOL_NAMES } from "../../data/tools"
import messages from "@/messages/ko.json"
import enMessages from "@/messages/en.json"

// next-intl은 ESM 전용이라 jest(CJS 변환)가 파싱하지 못하므로 저장소 관례대로 모킹한다.
jest.mock("next-intl", () => {
  const koMessages = require("@/messages/ko.json")
  return {
    useTranslations:
      (namespace: string) => (key: string, values?: Record<string, any>) => {
        const segments = `${namespace}.${key}`.split(".")
        let cur: unknown = koMessages
        for (const s of segments) {
          cur = (cur as Record<string, unknown> | undefined)?.[s]
        }
        if (typeof cur === "string" && values) {
          let str = cur
          for (const [k, v] of Object.entries(values)) {
            str = str.replace(`{${k}}`, String(v))
          }
          return str
        }
        return typeof cur === "string" ? cur : `${namespace}.${key}`
      },
  }
})

describe("UsageCard", () => {
  it("공유 목록의 모든 MCP 도구 이름을 표에 렌더한다", () => {
    render(<UsageCard />)

    // 목록이 @workspace/types로 옮겨진 뒤에도 화면이 그것을 그대로 쓰는지 확인
    expect(MCP_TOOL_NAMES.length).toBeGreaterThanOrEqual(10)
    for (const name of MCP_TOOL_NAMES) {
      expect(screen.getAllByText(name).length).toBeGreaterThan(0)
    }
  })

  // 목록에만 추가하고 번역을 빠뜨리면 화면에 "WorkspaceMcp.tools.x.desc"라는
  // 키 문자열이 그대로 노출된다 (UsageCard의 t() 폴백 동작)
  it("모든 도구가 ko·en 양쪽에 desc와 example을 갖는다", () => {
    type ToolCopy = { desc?: string; example?: string } | undefined
    const ko = messages.WorkspaceMcp.tools as Record<string, ToolCopy>
    const en = enMessages.WorkspaceMcp.tools as Record<string, ToolCopy>

    for (const name of MCP_TOOL_NAMES) {
      expect(ko[name]?.desc).toBeTruthy()
      expect(ko[name]?.example).toBeTruthy()
      expect(en[name]?.desc).toBeTruthy()
      expect(en[name]?.example).toBeTruthy()
    }
  })

  it("코드 생성 옵션 안내를 함께 보여준다", () => {
    render(<UsageCard />)
    expect(
      screen.getByText(messages.WorkspaceMcp.codeOptions.description)
    ).toBeInTheDocument()
  })
})
