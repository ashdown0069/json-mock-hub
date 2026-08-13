import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { toast } from "sonner"
import type { ReactNode } from "react"
import { axiosInstance } from "@/lib/axios"
import { useLogIn } from "../logInUserService"

jest.mock("next-intl", () => ({
  useTranslations: () => {
    const t = (key: string) => key
    t.has = (key: string) =>
      key === "auth.login.invalid_credentials" || key === "requestFailed"
    return t
  },
}))

jest.mock("sonner", () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}))

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  })
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

const loginError = Object.assign(new Error("failed"), {
  isAxiosError: true,
  response: {
    status: 401,
    data: {
      statusCode: 401,
      code: "auth.login.invalid_credentials",
      message: "이메일 또는 비밀번호가 올바르지 않습니다.",
    },
  },
})

describe("useLogIn 에러 처리", () => {
  beforeEach(() => jest.clearAllMocks())
  afterEach(() => jest.restoreAllMocks())

  it("로그인 실패 시 번역 키로 토스트한다", async () => {
    jest.spyOn(axiosInstance, "post").mockRejectedValue(loginError)

    const { result } = renderHook(() => useLogIn(), { wrapper })
    result.current.mutate({ email: "a@b.com", password: "pw" })

    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect(toast.error).toHaveBeenCalledWith(
      "auth.login.invalid_credentials",
      expect.anything()
    )
  })

  it("API의 raw message(하드코딩 한국어)를 그대로 노출하지 않는다", async () => {
    jest.spyOn(axiosInstance, "post").mockRejectedValue(loginError)

    const { result } = renderHook(() => useLogIn(), { wrapper })
    result.current.mutate({ email: "a@b.com", password: "pw" })

    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect(toast.error).not.toHaveBeenCalledWith(
      "이메일 또는 비밀번호가 올바르지 않습니다.",
      expect.anything()
    )
  })

  it("매핑되지 않은 코드는 generic 폴백을 쓴다", async () => {
    jest.spyOn(axiosInstance, "post").mockRejectedValue(
      Object.assign(new Error("failed"), {
        isAxiosError: true,
        response: {
          status: 500,
          data: { statusCode: 500, code: "common.internal_error", message: "서버 오류" },
        },
      })
    )

    const { result } = renderHook(() => useLogIn(), { wrapper })
    result.current.mutate({ email: "a@b.com", password: "pw" })

    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect(toast.error).toHaveBeenCalledWith("requestFailed", expect.anything())
  })
})
