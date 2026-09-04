import { render, screen, fireEvent } from "@testing-library/react"
import { EndpointDetails } from "../EndpointDetails"
import { useCreateMockApiStore } from "../../../store/useCreateMockApiStore"

// useTranslations는 NextIntlClientProvider 컨텍스트가 필요하므로 테스트 환경에서 간단히 모킹합니다.
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}))

describe("EndpointDetails 렌더링", () => {
  const prefix = "http://ws1.localhost:4001/api/shop/"

  beforeEach(() => {
    useCreateMockApiStore.setState({ apiPath: "" })
  })

  it("입력 Addon에 '/' 기호를 렌더링하고 기본 URL 프리뷰를 표시한다", () => {
    render(<EndpointDetails endpointPrefix={prefix} />)

    // Addon에 '/' 표시 확인
    expect(screen.getByText("/")).toBeInTheDocument()
    // 하단 프리뷰에 기본 endpointPrefix 표시 확인
    expect(screen.getByText(prefix)).toBeInTheDocument()
  })

  it("경로 입력값을 스토어에 반영하고 실시간 Full URL 프리뷰를 업데이트한다", () => {
    render(<EndpointDetails endpointPrefix={prefix} />)

    const input = screen.getByPlaceholderText("apiPathPlaceholder")
    fireEvent.change(input, {
      target: { value: "users" },
    })

    expect(useCreateMockApiStore.getState().apiPath).toBe("users")
    expect(screen.getByText(`${prefix}users`)).toBeInTheDocument()
  })

  it("선행 슬래시가 포함된 경로 입력 시 이중 슬래시 없이 정규화하여 프리뷰에 표시한다", () => {
    render(<EndpointDetails endpointPrefix={prefix} />)

    const input = screen.getByPlaceholderText("apiPathPlaceholder")
    fireEvent.change(input, {
      target: { value: "/products" },
    })

    expect(useCreateMockApiStore.getState().apiPath).toBe("/products")
    expect(screen.getByText(`${prefix}products`)).toBeInTheDocument()
  })
})
