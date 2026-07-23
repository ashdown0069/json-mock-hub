import { render, screen, fireEvent } from "@testing-library/react"
import { EndpointListPanel } from "../EndpointListPanel"
import { FileItem } from "@/features/file-browser/types"

// next-intl은 ESM 전용이라 jest(CJS 변환)가 파싱하지 못하므로 저장소 관례대로 모킹한다.
// (McpGuide.test.tsx와 동일 취지) useTranslations는 실제 ko 메시지를 네임스페이스 기준으로
// 조회해, "코드보기" 등 번역 문자열에 의존하는 단언이 그대로 동작하게 한다.
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

const pushMock = jest.fn()

// 라우터와 URL 파라미터를 모킹해 코드보기 버튼의 라우팅 동작을 검증합니다.
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useParams: () => ({ locale: "ko", workspaceId: "ws1" }),
}))

const item: FileItem = {
  id: "1",
  name: "users",
  itemType: "File",
  path: "/users",
}

describe("EndpointListPanel 코드보기 라우팅", () => {
  beforeEach(() => pushMock.mockClear())

  it("코드보기 클릭 시 워크스페이스 code 경로로 이동한다", () => {
    render(<EndpointListPanel item={item} workspaceId="ws1" />)
    fireEvent.click(screen.getAllByRole("button", { name: /코드보기/ })[0]!)
    expect(pushMock).toHaveBeenCalledWith("/workspaces/ws1/code")
  })

  it("코드보기 클릭 후에도 인라인 코드 블록을 렌더링하지 않는다", () => {
    render(<EndpointListPanel item={item} workspaceId="ws1" />)
    // 클릭 전에는 물론, 라우팅 호출이 발생한 이후에도 인라인 코드 블록이 추가되지 않아야
    // 회귀(토글 기반 인라인 렌더링으로의 복귀)를 검출할 수 있습니다.
    fireEvent.click(screen.getAllByRole("button", { name: /코드보기/ })[0]!)
    expect(document.querySelector("pre")).not.toBeInTheDocument()
  })
})
