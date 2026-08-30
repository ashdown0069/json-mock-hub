jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}))

import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { LogoutButton } from "../LogoutButton"
import { useLogout } from "../../api/logoutService"

jest.mock("../../api/logoutService")

describe("LogoutButton", () => {
  const mockMutate = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useLogout as jest.Mock).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    })
  })

  it("로그아웃 버튼 렌더링 및 클릭 시 mutation 호출", () => {
    render(<LogoutButton />)
    const button = screen.getByRole("button", { name: /logout/i })
    expect(button).toBeInTheDocument()

    fireEvent.click(button)
    expect(mockMutate).toHaveBeenCalledTimes(1)
  })

  it("isPending 상태일 때 버튼이 비활성화된다", () => {
    ;(useLogout as jest.Mock).mockReturnValue({
      mutate: mockMutate,
      isPending: true,
    })

    render(<LogoutButton />)
    const button = screen.getByRole("button", { name: /logout/i })
    expect(button).toBeDisabled()
  })
})
