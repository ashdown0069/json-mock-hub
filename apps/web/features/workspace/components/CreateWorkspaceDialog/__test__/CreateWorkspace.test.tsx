jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}))

const mutateMock = jest.fn()
jest.mock("../../../api/createWorkspace", () => ({
  useCreateWorkspace: () => ({ mutate: mutateMock, isPending: false }),
}))

// 다이얼로그 내부 구현이 아니라 open 상태 전달만 검증하므로 자식을 단순화한다
jest.mock("../CreateWorkspaceDialog", () => ({
  __esModule: true,
  default: ({
    open,
    setOpen,
    children,
  }: {
    open: boolean
    setOpen: (open: boolean) => void
    children: React.ReactNode
  }) => (
    <div>
      <span data-testid="open-state">{String(open)}</span>
      <button onClick={() => setOpen(true)}>열기</button>
      <button onClick={() => setOpen(false)}>닫기</button>
      {children}
    </div>
  ),
}))

jest.mock("../CreateWorkspaceForm", () => ({
  CreateWorkspaceForm: () => <form data-testid="ws-form" />,
}))

import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import CreateWorkspace from "../CreateWorkspace"

describe("CreateWorkspace 다이얼로그 개폐 상태", () => {
  it("초기에는 닫혀 있다", () => {
    render(<CreateWorkspace />)
    expect(screen.getByTestId("open-state")).toHaveTextContent("false")
  })

  it("setOpen(true)를 받으면 열리고, setOpen(false)를 받으면 닫힌다", () => {
    render(<CreateWorkspace />)

    fireEvent.click(screen.getByText("열기"))
    expect(screen.getByTestId("open-state")).toHaveTextContent("true")

    fireEvent.click(screen.getByText("닫기"))
    expect(screen.getByTestId("open-state")).toHaveTextContent("false")
  })
})
