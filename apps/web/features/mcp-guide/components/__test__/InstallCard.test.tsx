import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { InstallCard } from "../InstallCard"
import messages from "@/messages/ko.json"

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
    useFormatter: () => ({ dateTime: (date: Date) => date.toISOString() }),
  }
})

// CodeBlock이 내부적으로 사용하는 Shiki(ESM 전용 패키지)는 Jest 변환 대상이 아니므로 모킹한다.
jest.mock("../../../mock-api/lib/shiki", () => ({
  getHighlighter: jest.fn().mockResolvedValue({
    codeToHtml: (code: string) => `<pre class="shiki"><code>${code}</code></pre>`,
  }),
}))

// 키 조회·재발급 훅을 모킹해 네트워크 없이 화면 동작만 검증한다
const mockMutate = jest.fn()
jest.mock("../../api/apiKey", () => ({
  useWorkspaceApiKey: jest.fn(),
  useReissueApiKey: jest.fn(),
}))

import { useWorkspaceApiKey, useReissueApiKey } from "../../api/apiKey"

const mockedUseWorkspaceApiKey = useWorkspaceApiKey as jest.Mock
const mockedUseReissueApiKey = useReissueApiKey as jest.Mock

/** 키 조회가 성공한 기본 상태로 렌더한다 */
function renderWithKey() {
  mockedUseWorkspaceApiKey.mockReturnValue({
    data: { apiKey: "mock_test_key", issuedAt: "2026-07-28T00:00:00Z" },
    isLoading: false,
  })
  mockedUseReissueApiKey.mockReturnValue({ mutate: mockMutate, isPending: false })
  render(<InstallCard workspaceId="ws-xyz" />)
}

describe("InstallCard", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("mcp 서버가 배포되지 않으므로 저장소 clone 전제를 안내한다", () => {
    renderWithKey()
    expect(
      screen.getByText(messages.WorkspaceMcp.install.step1)
    ).toBeInTheDocument()
  })

  it("설치 방법 두 가지를 탭 없이 한 화면에 함께 보여준다", () => {
    renderWithKey()
    expect(
      screen.getByText(messages.WorkspaceMcp.install.json.title)
    ).toBeInTheDocument()
    expect(
      screen.getByText(messages.WorkspaceMcp.install.cli.title)
    ).toBeInTheDocument()
    expect(screen.queryByRole("tab")).not.toBeInTheDocument()
  })

  it("붙여넣기용 JSON에 mcpServers 블록과 워크스페이스 값을 채운다", () => {
    renderWithKey()
    expect(screen.getByText(/"mcpServers"/)).toBeInTheDocument()
    expect(screen.getByText(/"MOCK_HUB_API_KEY": "mock_test_key"/)).toBeInTheDocument()
    expect(screen.getByText(/"MOCK_HUB_WORKSPACE_ID": "ws-xyz"/)).toBeInTheDocument()
  })

  it("JSON 문법이 깨지지 않도록 Windows 경로 표기법을 안내한다", () => {
    renderWithKey()
    expect(
      screen.getByText(messages.WorkspaceMcp.install.json.windowsPathNote)
    ).toBeInTheDocument()
  })

  it("local 스코프로 등록하는 CLI 설치 명령을 보여준다", () => {
    renderWithKey()
    expect(screen.getByText(/claude mcp add --scope local/)).toBeInTheDocument()
  })

  it("CLI 명령에 워크스페이스 ID와 API 키를 채워 넣는다", () => {
    renderWithKey()
    expect(screen.getByText(/--env MOCK_HUB_API_KEY=mock_test_key/)).toBeInTheDocument()
    expect(screen.getByText(/--env MOCK_HUB_WORKSPACE_ID=ws-xyz/)).toBeInTheDocument()
  })

  it("API 키 취급 주의 문구를 보여준다", () => {
    renderWithKey()
    expect(
      screen.getByText(messages.WorkspaceMcp.install.securityNote)
    ).toBeInTheDocument()
  })

  it("멤버 누구나 자기 키를 재발급할 수 있도록 재발급 버튼을 보여준다", () => {
    renderWithKey()
    expect(
      screen.getByRole("button", { name: messages.WorkspaceMcp.apiKey.reissue })
    ).toBeInTheDocument()
  })

  it("재발급 버튼을 누르면 확인 다이얼로그를 띄운다", async () => {
    // 파괴적 액션이므로 즉시 실행하지 않는다
    const user = userEvent.setup()
    renderWithKey()

    await user.click(
      screen.getByRole("button", { name: messages.WorkspaceMcp.apiKey.reissue })
    )

    expect(
      screen.getByText(messages.WorkspaceMcp.apiKey.reissueDialogDescription)
    ).toBeInTheDocument()
    expect(mockMutate).not.toHaveBeenCalled()
  })

  it("키를 불러오는 동안에는 두 설치 방법을 모두 렌더하지 않는다", () => {
    mockedUseWorkspaceApiKey.mockReturnValue({ data: undefined, isLoading: true })
    mockedUseReissueApiKey.mockReturnValue({ mutate: mockMutate, isPending: false })
    render(<InstallCard workspaceId="ws-xyz" />)

    expect(screen.queryByText(/claude mcp add/)).not.toBeInTheDocument()
    expect(screen.queryByText(/"mcpServers"/)).not.toBeInTheDocument()
  })

  it("키 조회에 실패하면 설치 안내 대신 비멤버 안내로 대체한다", () => {
    mockedUseWorkspaceApiKey.mockReturnValue({ data: undefined, isLoading: false })
    mockedUseReissueApiKey.mockReturnValue({ mutate: mockMutate, isPending: false })
    render(<InstallCard workspaceId="ws-xyz" />)

    expect(
      screen.getByText(messages.WorkspaceMcp.apiKeyUnavailable)
    ).toBeInTheDocument()
    expect(screen.queryByText(/claude mcp add/)).not.toBeInTheDocument()
    expect(screen.queryByText(/"mcpServers"/)).not.toBeInTheDocument()
    // 키가 없으면 재발급 대상도 없다
    expect(
      screen.queryByRole("button", { name: messages.WorkspaceMcp.apiKey.reissue })
    ).not.toBeInTheDocument()
  })
})
