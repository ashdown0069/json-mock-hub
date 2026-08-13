import { render, screen, fireEvent } from "@testing-library/react"
import { ConfirmDialog } from "../ConfirmDialog"

describe("ConfirmDialog", () => {
  const props = {
    isOpen: true,
    onOpenChange: jest.fn(),
    title: "삭제하시겠습니까?",
    description: "이 작업은 되돌릴 수 없습니다.",
    confirmText: "삭제",
    cancelText: "취소",
    onConfirm: jest.fn(),
  }

  beforeEach(() => {
    props.onOpenChange.mockReset()
    props.onConfirm.mockReset()
  })

  it("isOpen이 false면 다이얼로그 내용을 표시하지 않는다", () => {
    render(<ConfirmDialog {...props} isOpen={false} />)

    expect(screen.queryByText("삭제하시겠습니까?")).not.toBeInTheDocument()
  })

  it("isOpen이 true면 제목·설명·확인/취소 버튼을 표시한다", () => {
    render(<ConfirmDialog {...props} />)

    expect(screen.getByText("삭제하시겠습니까?")).toBeInTheDocument()
    expect(screen.getByText("이 작업은 되돌릴 수 없습니다.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "삭제" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "취소" })).toBeInTheDocument()
  })

  it("확인 버튼을 누르면 onConfirm을 호출한다", () => {
    render(<ConfirmDialog {...props} />)

    fireEvent.click(screen.getByRole("button", { name: "삭제" }))

    expect(props.onConfirm).toHaveBeenCalledTimes(1)
  })

  it("isLoading이 true면 확인·취소 버튼을 비활성화한다", () => {
    render(<ConfirmDialog {...props} isLoading={true} />)

    expect(screen.getByRole("button", { name: "삭제" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "취소" })).toBeDisabled()
  })
})
