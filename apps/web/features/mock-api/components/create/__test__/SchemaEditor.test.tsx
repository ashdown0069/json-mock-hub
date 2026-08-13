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
  useTranslations: () => (key: string) => {
    if (key === "idFieldAuto") return "자동 증가 (1, 2, 3…)"
    return key
  },
}))

const renderEditor = (duplicateFieldIds: Set<string> = new Set()) =>
  render(<SchemaEditor duplicateFieldIds={duplicateFieldIds} />)

describe("SchemaEditor i18n", () => {
  beforeEach(() => {
    useCreateMockApiStore.getState().reset()
  })

  it("필드가 없으면 emptyFields 안내 문구와 dataSchema/addField 라벨이 키로 렌더된다", () => {
    useCreateMockApiStore.setState({ fields: [] })

    renderEditor()

    expect(screen.getByText("dataSchema")).toBeInTheDocument()
    expect(screen.getByText("addField")).toBeInTheDocument()
    expect(screen.getByText("emptyFields")).toBeInTheDocument()
  })

  it("필드가 있으면 필드 이름 input의 placeholder가 fieldNamePlaceholder 키로 렌더된다", () => {
    useCreateMockApiStore.setState({
      fields: [{ id: "f1", name: "", type: "string", fakerMethod: "none" }],
    })

    renderEditor()

    expect(screen.getByPlaceholderText("fieldNamePlaceholder")).toBeInTheDocument()
  })
})

describe("잠금 id 행", () => {
  beforeEach(() => {
    useCreateMockApiStore.getState().reset()
  })

  it("필드가 없어도 읽기 전용 id 행이 항상 표시된다", () => {
    useCreateMockApiStore.setState({ fields: [] })
    renderEditor()
    expect(screen.getByText("id")).toBeInTheDocument()
    expect(screen.getByText(/자동 증가/)).toBeInTheDocument()
  })

  it("id 행에는 삭제 버튼이 없다", () => {
    useCreateMockApiStore.setState({ fields: [] })
    renderEditor()
    const lockedRow = screen.getByTestId("locked-id-row")
    expect(lockedRow.querySelector("button")).toBeNull()
    expect(lockedRow.querySelector("input")).toBeNull()
  })
})

describe("중복 필드명 인라인 표시", () => {
  beforeEach(() => {
    useCreateMockApiStore.getState().reset()
  })

  it("중복 집합에 포함된 행마다 경고 문구와 aria-invalid가 표시된다", () => {
    useCreateMockApiStore.setState({
      fields: [
        { id: "f1", name: "email", type: "string", fakerMethod: "none" },
        { id: "f2", name: "email", type: "string", fakerMethod: "none" },
      ],
    })

    // next-intl 모킹이 키를 그대로 반환하므로 문구는 "duplicateFieldName"으로 렌더된다
    renderEditor(new Set(["f1", "f2"]))

    expect(screen.getAllByRole("alert")).toHaveLength(2)
    expect(screen.getAllByText("duplicateFieldName")).toHaveLength(2)
    screen.getAllByDisplayValue("email").forEach((input) => {
      expect(input).toHaveAttribute("aria-invalid", "true")
    })
  })

  it("중복이 없으면 경고 문구가 렌더되지 않는다", () => {
    useCreateMockApiStore.setState({
      fields: [{ id: "f1", name: "email", type: "string", fakerMethod: "none" }],
    })

    renderEditor()

    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    expect(screen.getByDisplayValue("email")).toHaveAttribute(
      "aria-invalid",
      "false"
    )
  })

  it("중첩 하위 행도 중복이면 경고가 표시된다", () => {
    useCreateMockApiStore.setState({
      fields: [
        {
          id: "u",
          name: "user",
          type: "object",
          fakerMethod: "none",
          fields: [
            { id: "u1", name: "tag", type: "string", fakerMethod: "none" },
            { id: "u2", name: "tag", type: "string", fakerMethod: "none" },
          ],
        },
      ],
    })

    renderEditor(new Set(["u1", "u2"]))

    expect(screen.getAllByRole("alert")).toHaveLength(2)
  })
})

