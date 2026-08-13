import { render, screen, fireEvent } from "@testing-library/react"
import ErrorBoundary from "../error"

jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}))

describe("로케일 error 경계", () => {
  const error = Object.assign(new Error("boom"), { digest: "abc123" })

  it("오류 제목과 설명을 보여준다", () => {
    render(<ErrorBoundary error={error} reset={jest.fn()} />)

    expect(screen.getByText("title")).toBeInTheDocument()
    expect(screen.getByText("description")).toBeInTheDocument()
  })

  it("다시 시도 버튼이 reset을 호출한다", () => {
    const reset = jest.fn()
    render(<ErrorBoundary error={error} reset={reset} />)

    fireEvent.click(screen.getByRole("button", { name: "retry" }))

    expect(reset).toHaveBeenCalledTimes(1)
  })

  it("내부 오류 메시지를 사용자에게 노출하지 않는다", () => {
    render(<ErrorBoundary error={error} reset={jest.fn()} />)

    expect(screen.queryByText(/boom/)).not.toBeInTheDocument()
  })
})
