import { render, screen, fireEvent } from "@testing-library/react"
import { useForm } from "react-hook-form"
import { FormInputField } from "../FormInputField"

interface TestForm {
  password: string
  nickname: string
}

/** react-hook-form의 control을 만들기 위한 최소 래퍼 */
function Harness({ type = "password" }: { type?: string }) {
  const { control } = useForm<TestForm>({
    defaultValues: { password: "", nickname: "" },
  })
  return (
    <FormInputField<TestForm>
      control={control}
      name={type === "password" ? "password" : "nickname"}
      label="비밀번호"
      type={type}
    />
  )
}

describe("FormInputField 비밀번호 표시 토글", () => {
  it("초기에는 입력값이 가려진다", () => {
    const { container } = render(<Harness />)
    // FieldLabel이 htmlFor로 input과 연결되지 않아 getByLabelText를 쓸 수 없다.
    // (브리프에서 사전 승인된 대안: container.querySelector("input"))
    const input = container.querySelector("input")
    expect(input).toHaveAttribute("type", "password")
  })

  it("토글 버튼을 누르면 평문으로 바뀌고, 다시 누르면 되돌아간다", () => {
    const { container } = render(<Harness />)
    const input = container.querySelector("input")!
    // 토글 버튼은 아이콘 전용이라 접근 가능한 이름이 없으므로 유일한 button으로 찾는다
    const toggleButton = screen.getByRole("button")

    fireEvent.click(toggleButton)
    expect(input).toHaveAttribute("type", "text")

    fireEvent.click(toggleButton)
    expect(input).toHaveAttribute("type", "password")
  })

  it("password 타입이 아니면 토글 버튼을 렌더링하지 않는다", () => {
    render(<Harness type="text" />)
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })
})
