const mockUseGetWorkspaceList = jest.fn()
jest.mock("../../api/getWorkspaceList", () => ({
  useGetWorkspaceList: () => mockUseGetWorkspaceList(),
}))
jest.mock("../WorkspaceCard", () => ({
  __esModule: true,
  WorkspaceCard: ({ id, name }: { id: string; name: string }) => (
    <div data-testid="workspace-card" data-id={id}>{name}</div>
  ),
}))
jest.mock("../CreateWorkspaceDialog/CreateWorkspace", () => ({
  __esModule: true,
  default: () => <button>create-dialog</button>,
}))
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}))

import { render, screen } from "@testing-library/react"
import { Workspaces } from "../Workspaces"

describe("Workspaces", () => {
  beforeEach(() => {
    mockUseGetWorkspaceList.mockReset()
  })

  it("로딩 중에는 loading 문구를 표시한다", () => {
    mockUseGetWorkspaceList.mockReturnValue({ isLoading: true })
    render(<Workspaces />)

    expect(screen.getByText("loading")).toBeInTheDocument()
    expect(screen.queryByTestId("workspace-card")).not.toBeInTheDocument()
  })

  it("조회 실패 시 loadError 문구를 표시한다", () => {
    mockUseGetWorkspaceList.mockReturnValue({ isError: true })
    render(<Workspaces />)

    expect(screen.getByText("loadError")).toBeInTheDocument()
    expect(screen.queryByTestId("workspace-card")).not.toBeInTheDocument()
  })

  it("데이터가 없거나(undefined) 빈 배열이면 emptyTitle/emptyDescription을 표시한다", () => {
    mockUseGetWorkspaceList.mockReturnValue({ data: [] })
    render(<Workspaces />)

    expect(screen.getByText("emptyTitle")).toBeInTheDocument()
    expect(screen.getByText("emptyDescription")).toBeInTheDocument()
    expect(screen.queryByTestId("workspace-card")).not.toBeInTheDocument()
  })

  it("실패 상태를 빈 목록(emptyTitle)으로 위장하지 않는다", () => {
    mockUseGetWorkspaceList.mockReturnValue({ isError: true })
    render(<Workspaces />)

    expect(screen.queryByText("emptyTitle")).not.toBeInTheDocument()
  })

  it("목록이 1개 이상이면 WorkspaceCard 목록을 렌더한다", () => {
    mockUseGetWorkspaceList.mockReturnValue({
      data: [{ id: "ws1", name: "첫 워크스페이스" }],
    })
    render(<Workspaces />)

    expect(screen.getByTestId("workspace-card")).toHaveTextContent("첫 워크스페이스")
    expect(screen.queryByText("emptyTitle")).not.toBeInTheDocument()
  })
})
