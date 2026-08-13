import { render, screen, fireEvent } from "@testing-library/react"
import { TreeActionButtons } from "../TreeActionButtons"
import { useMyPermissions } from "@/hooks/useMyPermissions"

// Tooltip 컴포넌트 모킹 (포탈이나 애니메이션 등으로 인한 테스트 번거로움 방지)
jest.mock("@/components/Tooltip/Tooltip", () => ({
  Tooltip: ({ children, tooltipText }: { children: React.ReactNode; tooltipText: string }) => (
    <div data-testid="tooltip" data-text={tooltipText}>
      {children}
    </div>
  ),
}))
jest.mock("@/hooks/useWorkspaceBasePath", () => ({
  useWorkspaceBasePath: () => ({ workspaceId: "ws1" }),
}))
jest.mock("@/hooks/useMyPermissions", () => ({
  useMyPermissions: jest.fn(),
}))

const mockedUseMyPermissions = useMyPermissions as jest.Mock

const allowAll = {
  canCreate: true,
  canRename: true,
  canMove: true,
  canDelete: true,
  canUpdate: true,
}

const denyAll = {
  canCreate: false,
  canRename: false,
  canMove: false,
  canDelete: false,
  canUpdate: false,
}

describe("TreeActionButtons", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("onEdit prop이 주어지지 않으면 Edit 버튼을 렌더링하지 않는다", () => {
    mockedUseMyPermissions.mockReturnValue(allowAll)
    render(<TreeActionButtons />)

    expect(screen.queryByRole("button", { name: /Edit Mock API/i })).toBeNull()
  })

  it("onEdit prop이 제공되고 canUpdate 권한이 있으면 Edit 버튼이 활성화되어 렌더링된다", () => {
    mockedUseMyPermissions.mockReturnValue(allowAll)
    const onEdit = jest.fn()
    render(<TreeActionButtons onEdit={onEdit} />)

    const button = screen.getByRole("button")
    expect(button).toBeEnabled()

    fireEvent.click(button)
    expect(onEdit).toHaveBeenCalledTimes(1)
  })

  it("canUpdate 권한이 없으면 Edit 버튼은 비활성화(disabled) 상태로 렌더링된다", () => {
    mockedUseMyPermissions.mockReturnValue(denyAll)
    const onEdit = jest.fn()
    render(<TreeActionButtons onEdit={onEdit} />)

    const button = screen.getByRole("button")
    expect(button).toBeDisabled()

    // 툴팁 텍스트에 권한 없음 메시지가 노출되는지 검증
    const tooltip = screen.getByTestId("tooltip")
    expect(tooltip.getAttribute("data-text")).toBe("No permission")
  })
})
