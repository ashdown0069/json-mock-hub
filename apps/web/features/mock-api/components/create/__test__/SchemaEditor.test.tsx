import { render, screen } from "@testing-library/react"
import { SchemaEditor } from "../SchemaEditor"
import { useCreateMockApiStore } from "../../../store/useCreateMockApiStore"

// Radix Select 렌더에 필요한 ResizeObserver 폴리필
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

describe("SchemaEditor i18n", () => {
  beforeEach(() => {
    useCreateMockApiStore.getState().reset()
  })

  it("필드가 없으면 emptyFields 안내 문구와 dataSchema/addField 라벨이 키로 렌더된다", () => {
    useCreateMockApiStore.setState({ fields: [] })

    render(<SchemaEditor />)

    expect(screen.getByText("dataSchema")).toBeInTheDocument()
    expect(screen.getByText("addField")).toBeInTheDocument()
    expect(screen.getByText("emptyFields")).toBeInTheDocument()
  })

  it("필드가 있으면 필드 이름 input의 placeholder가 fieldNamePlaceholder 키로 렌더된다", () => {
    useCreateMockApiStore.setState({
      fields: [{ id: "f1", name: "", type: "string", fakerMethod: "none" }],
    })

    render(<SchemaEditor />)

    expect(screen.getByPlaceholderText("fieldNamePlaceholder")).toBeInTheDocument()
  })
})
