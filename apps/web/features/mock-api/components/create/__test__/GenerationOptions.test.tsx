import { render, screen } from "@testing-library/react"
import { GenerationOptions } from "../GenerationOptions"
import { useCreateMockApiStore } from "../../../store/useCreateMockApiStore"

// Radix Slider/Switch 렌더에 필요한 ResizeObserver 폴리필
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
;(global as any).ResizeObserver = ResizeObserverStub

jest.mock("next-intl", () => ({
  useLocale: () => "ko",
  useTranslations: () => (key: string) => key,
}))

describe("GenerationOptions i18n", () => {
  beforeEach(() => {
    useCreateMockApiStore.getState().reset()
  })

  it("섹션 라벨들이 키로 렌더된다", () => {
    render(<GenerationOptions />)

    expect(screen.getByText("generationOptions")).toBeInTheDocument()
    expect(screen.getByText("mockItems")).toBeInTheDocument()
    expect(screen.getByText("apiFeatures")).toBeInTheDocument()
    expect(screen.getByText("paginationMetadata")).toBeInTheDocument()
  })

  it("페이지네이션을 켜면 pageParam input placeholder가 pageParamPlaceholder 키로 렌더된다", () => {
    useCreateMockApiStore.setState({ enablePagination: true })

    render(<GenerationOptions />)

    expect(screen.getByPlaceholderText("pageParamPlaceholder")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("limitParamPlaceholder")).toBeInTheDocument()
  })
})
