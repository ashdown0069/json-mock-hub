import { render, screen } from "@testing-library/react"
import { McpGuide } from "../McpGuide"

// 각 카드의 동작은 InstallCard.test.tsx·UsageCard.test.tsx가 검증한다.
// 여기서는 조립만 확인하므로 하위 카드를 모킹해 Shiki·API 훅 모킹을 걷어낸다.
jest.mock("../InstallCard", () => ({
  InstallCard: ({ workspaceId }: { workspaceId: string }) => (
    <div data-testid="install-card">{workspaceId}</div>
  ),
}))
jest.mock("../UsageCard", () => ({
  UsageCard: () => <div data-testid="usage-card" />,
}))

describe("McpGuide", () => {
  it("설치 카드와 사용법 카드를 함께 렌더한다", () => {
    render(<McpGuide workspaceId="ws-xyz" />)
    expect(screen.getByTestId("install-card")).toBeInTheDocument()
    expect(screen.getByTestId("usage-card")).toBeInTheDocument()
  })

  it("설치 카드에 워크스페이스 ID를 전달한다", () => {
    render(<McpGuide workspaceId="ws-xyz" />)
    expect(screen.getByTestId("install-card")).toHaveTextContent("ws-xyz")
  })
})
