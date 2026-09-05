import React from "react"
import { render, screen } from "@testing-library/react"
import { DashboardTitle } from "../DashboardTitle"

const mockUseGetWorkspace = jest.fn()
jest.mock("@/features/workspace/api/getWorkspace", () => ({
  useGetWorkspace: (...args: unknown[]) => mockUseGetWorkspace(...args),
}))

jest.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: { name: string }) => {
    if (key === "dashboardTitleWithName") return `${values?.name} Dashboard`
    return "Workspace Dashboard"
  },
}))

describe("DashboardTitle 컴포넌트", () => {
  beforeEach(() => {
    mockUseGetWorkspace.mockReset()
  })

  it("워크스페이스 데이터가 로딩 중일 때는 섹션 스켈레톤을 렌더링한다", () => {
    mockUseGetWorkspace.mockReturnValue({ isLoading: true })

    render(<DashboardTitle workspaceId="ws1" />)
    expect(screen.getByTestId("dashboard-title-skeleton")).toBeInTheDocument()
  })

  it("워크스페이스 이름이 있으면 워크스페이스 이름을 포함한 타이틀을 렌더링한다", () => {
    mockUseGetWorkspace.mockReturnValue({
      isLoading: false,
      data: { name: "My Project" },
    })

    render(<DashboardTitle workspaceId="ws1" />)
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "My Project Dashboard"
    )
  })
})
