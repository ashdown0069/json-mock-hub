import { render, screen, fireEvent } from "@testing-library/react"
import { SchemaBuilderTab } from "../SchemaBuilderTab"
import { useCreateMockApiStore } from "../../../store/useCreateMockApiStore"

// jsdom에는 ResizeObserver가 구현되어 있지 않아, 이를 사용하는
// Radix 기반 컴포넌트(Select 등)를 렌더링하려면 최소 폴리필이 필요합니다.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
;(global as any).ResizeObserver = ResizeObserverStub

// useLocale/useTranslations는 NextIntlClientProvider 컨텍스트가 필요하므로 테스트 환경에서 간단히 모킹합니다.
jest.mock("next-intl", () => ({
  useLocale: () => "ko",
  useTranslations: () => (key: string) => key,
}))

// sonner의 toast는 실제 UI 토스트 없이 호출 여부만 검증할 수 있도록 모킹합니다.
jest.mock("sonner", () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}))

// generateDummyData는 내부적으로 ESM 전용 패키지인 @faker-js/faker를 사용해
// jest(CJS 변환) 환경에서 파싱이 실패하므로, 더미 데이터 생성 로직 자체는
// 이 테스트의 관심사가 아니기에 단순 모킹으로 대체합니다.
jest.mock("@workspace/mockgen/generateData", () => ({
  generateDummyData: jest.fn(() => []),
}))

describe("SchemaBuilderTab 생성 성공/실패 분리", () => {
  beforeEach(() => {
    // 각 테스트 전 스토어를 초기화하고, 유효성 검사를 통과할 apiPath를 미리 세팅합니다.
    useCreateMockApiStore.getState().reset()
    useCreateMockApiStore.setState({
      apiPath: "users",
      fields: [{ id: "f1", name: "title", type: "string", fakerMethod: "none" }],
    })
  })

  it("Generate Endpoint 클릭 시 onCreate는 호출되지만 onClose는 호출되지 않는다", () => {
    const onCreate = jest.fn()
    const onClose = jest.fn()

    render(
      <SchemaBuilderTab
        onClose={onClose}
        onCreate={onCreate}
        endpointPrefix="http://ws1.localhost:3000/api/shop/"
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "submitCreate" }))

    // 부모의 mutation(onCreate)은 호출되어야 하지만,
    // 성공 여부를 알 수 없는 시점에 onClose가 동기적으로 호출되어서는 안 됩니다.
    expect(onCreate).toHaveBeenCalledTimes(1)
    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        fieldDefs: [{ id: "f1", name: "title", type: "string", fakerMethod: "none" }],
      })
    )
    expect(onClose).not.toHaveBeenCalled()
  })

  it("이름이 지정된 필드가 없으면 Generate Endpoint 버튼이 비활성화된다", () => {
    useCreateMockApiStore.setState({
      fields: [{ id: "f1", name: "", type: "string", fakerMethod: "none" }],
    })

    const onCreate = jest.fn()
    const onClose = jest.fn()

    render(
      <SchemaBuilderTab
        onClose={onClose}
        onCreate={onCreate}
        endpointPrefix="http://ws1.localhost:3000/api/shop/"
      />
    )

    const button = screen.getByRole("button", { name: "submitCreate" })
    expect(button).toBeDisabled()
  })
})
