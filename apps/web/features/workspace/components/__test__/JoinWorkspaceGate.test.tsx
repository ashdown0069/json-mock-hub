const mockJoinWorkspace = jest.fn()
const mockHandleError = jest.fn()
const mockRefresh = jest.fn()

jest.mock("../../api/joinWorkspace", () => ({
  useJoinWorkspace: () => ({
    mutate: mockJoinWorkspace,
    isPending: false,
  }),
}))
jest.mock("@/hooks/useApiErrorHandler", () => ({
  useApiErrorHandler: () => mockHandleError,
}))
jest.mock("@/i18n/routing", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}))
jest.mock("sonner", () => ({ toast: { success: jest.fn() } }))

import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { JoinWorkspaceGate } from "../JoinWorkspaceGate"

describe("JoinWorkspaceGate", () => {
  beforeEach(() => {
    mockJoinWorkspace.mockReset()
    mockHandleError.mockReset()
    mockRefresh.mockReset()
  })

  it("비밀번호를 입력하고 제출하면 joinWorkspace mutation을 호출한다", async () => {
    render(<JoinWorkspaceGate workspaceId="ws1" />)

    const input = screen.getByPlaceholderText("passwordPlaceholder")
    fireEvent.change(input, { target: { value: "pass123" } })

    const form = input.closest("form")!
    fireEvent.submit(form)

    await waitFor(() => {
      expect(mockJoinWorkspace).toHaveBeenCalledWith(
        { password: "pass123" },
        expect.objectContaining({
          onSuccess: expect.any(Function),
          onError: expect.any(Function),
        })
      )
    })
  })

  it("참여 실패 시 useApiErrorHandler에 defaultMsg: joinError를 전달하고 폼 에러와 필드 초기화를 수행한다", async () => {
    const error = { response: { status: 400 } }
    mockJoinWorkspace.mockImplementation((_, { onError }) => {
      onError(error)
    })

    mockHandleError.mockImplementation((err, options) => {
      expect(options.showToast).toBe(false)
      expect(options.defaultMsg).toBe("joinError")
      options.onHandled("비밀번호가 일치하지 않습니다.")
    })

    render(<JoinWorkspaceGate workspaceId="ws1" />)

    const input = screen.getByPlaceholderText("passwordPlaceholder") as HTMLInputElement
    fireEvent.change(input, { target: { value: "wrongpass" } })

    const form = input.closest("form")!
    fireEvent.submit(form)

    await waitFor(() => {
      expect(mockHandleError).toHaveBeenCalledWith(error, expect.any(Object))
      expect(screen.getByText("비밀번호가 일치하지 않습니다.")).toBeInTheDocument()
      expect(input.value).toBe("")
    })
  })

  it("참여 성공 시 toast와 router.refresh()를 호출한다", async () => {
    mockJoinWorkspace.mockImplementation((_, { onSuccess }) => {
      onSuccess()
    })

    render(<JoinWorkspaceGate workspaceId="ws1" />)

    const input = screen.getByPlaceholderText("passwordPlaceholder")
    fireEvent.change(input, { target: { value: "correctpass" } })

    const form = input.closest("form")!
    fireEvent.submit(form)

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalledTimes(1)
    })
  })
})
