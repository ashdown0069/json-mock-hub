import { render, screen, fireEvent } from "@testing-library/react"
import { EndpointDetails } from "../EndpointDetails"
import { useCreateMockApiStore } from "../../../store/useCreateMockApiStore"

// useTranslations는 NextIntlClientProvider 컨텍스트가 필요하므로 테스트 환경에서 간단히 모킹합니다.
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}))

describe("EndpointDetails 렌더링", () => {
  beforeEach(() => {
    useCreateMockApiStore.setState({ apiPath: "" })
  })

  it("전달된 endpointPrefix를 접두어로 표시한다", () => {
    render(
      <EndpointDetails endpointPrefix="http://ws1.localhost:4001/api/shop/" />
    )
    expect(
      screen.getByText("http://ws1.localhost:4001/api/shop/")
    ).toBeInTheDocument()
  })

  it("경로 입력값을 스토어에 반영한다", () => {
    render(<EndpointDetails endpointPrefix="http://ws1.localhost:4001/api/" />)

    fireEvent.change(screen.getByPlaceholderText("apiPathPlaceholder"), {
      target: { value: "users" },
    })

    expect(useCreateMockApiStore.getState().apiPath).toBe("users")
  })
})
