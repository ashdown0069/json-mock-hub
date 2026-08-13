import { render, screen, fireEvent } from "@testing-library/react"
import { GenerationOptions } from "../GenerationOptions"
import { useCreateMockApiStore } from "../../../store/useCreateMockApiStore"
import ko from "../../../../../messages/ko.json"

// Radix Slider/Switch 렌더에 필요한 ResizeObserver 폴리필
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
;(global as any).ResizeObserver = ResizeObserverStub

jest.mock("next-intl", () => ({
  useLocale: () => "ko",
  useTranslations: () => (key: string) => (ko.MockApiDialog as any)[key] || key,
}))

const renderOptions = () => render(<GenerationOptions />)

describe("GenerationOptions i18n", () => {
  beforeEach(() => {
    useCreateMockApiStore.getState().reset()
  })

  it("섹션 라벨들이 키로 렌더된다", () => {
    renderOptions()

    expect(screen.getByText("생성 옵션")).toBeInTheDocument()
    expect(screen.getByText("Mock 아이템")).toBeInTheDocument()
    expect(screen.getByText("API 기능")).toBeInTheDocument()
    expect(screen.getByText("페이지네이션 메타데이터")).toBeInTheDocument()
  })

  it("페이지네이션을 켜면 pageParam input placeholder가 pageParamPlaceholder 키로 렌더된다", () => {
    useCreateMockApiStore.setState({ enablePagination: true })

    renderOptions()

    expect(screen.getByPlaceholderText("예: page")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("예: limit")).toBeInTheDocument()
  })
})

describe("정렬·검색 설정", () => {
  beforeEach(() => {
    useCreateMockApiStore.getState().reset()
  })

  it("정렬 토글을 켜면 정렬/정렬 방향 파라미터 입력이 나타난다", () => {
    renderOptions()
    expect(screen.queryByPlaceholderText("예: _sort")).not.toBeInTheDocument()
    fireEvent.click(screen.getByText("정렬 기능"))
    expect(screen.getByPlaceholderText("예: _sort")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("예: _order")).toBeInTheDocument()
  })

  it("검색 토글을 켜면 검색 파라미터 입력이 나타난다", () => {
    renderOptions()
    fireEvent.click(screen.getByText("전문검색 기능"))
    expect(screen.getByPlaceholderText("예: q")).toBeInTheDocument()
  })

  it("파라미터명 입력이 스토어에 반영된다", () => {
    useCreateMockApiStore.setState({ enableSort: true })
    renderOptions()
    fireEvent.change(screen.getByPlaceholderText("예: _sort"), {
      target: { value: "orderBy" },
    })
    expect(useCreateMockApiStore.getState().sortParam).toBe("orderBy")
  })

  it("상시 지원 안내 문구(queryAlwaysOn)는 더 이상 표시되지 않는다", () => {
    renderOptions()
    expect(screen.queryByText(/항상 지원/)).not.toBeInTheDocument()
  })
})

