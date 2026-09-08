import { render, screen } from "@testing-library/react"
import { CreateMockApiDialog } from "../CreateMockApiDialog"
import { useCreateMockApiStore } from "../../../store/useCreateMockApiStore"

// jsdom에는 ResizeObserver가 구현되어 있지 않으므로 모킹
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

jest.mock("sonner", () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}))

jest.mock("@workspace/mockgen/generateData", () => ({
  generateDummyData: jest.fn(() => []),
}))

describe("CreateMockApiDialog", () => {
  const workspaceId = "ws-test"
  const onCreate = jest.fn()
  const onClose = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    useCreateMockApiStore.getState().reset()
  })

  it("editItem이 없을 때 titleCreate 타이틀과 submitCreate 버튼이 나타난다", () => {
    useCreateMockApiStore.setState({ apiPath: "test-api" })

    render(
      <CreateMockApiDialog
        isOpen={true}
        onClose={onClose}
        onCreate={onCreate}
        workspaceId={workspaceId}
        editItem={null}
      />
    )

    expect(screen.getByText("titleCreate")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "submitCreate" })).toBeInTheDocument()
  })

  it("editItem이 존재할 때 titleEdit 타이틀과 submitEdit 버튼이 나타난다", () => {
    useCreateMockApiStore.setState({ apiPath: "test-api" })

    const editItemMock = {
      id: "file-id",
      name: "test-api",
      itemType: "File" as const,
      path: "/test-api",
      parentId: null,
      json: { id: "1" },
      options: { pagination: false },
      fields: [],
    }

    render(
      <CreateMockApiDialog
        isOpen={true}
        onClose={onClose}
        onCreate={onCreate}
        workspaceId={workspaceId}
        editItem={editItemMock}
      />
    )

    expect(screen.getByText("titleEdit")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "submitEdit" })).toBeInTheDocument()
  })

  it("API Path input에 설정된 i18n 플레이스홀더가 정확히 표시된다", () => {
    render(
      <CreateMockApiDialog
        isOpen={true}
        onClose={onClose}
        onCreate={onCreate}
        workspaceId={workspaceId}
        editItem={null}
      />
    )

    expect(screen.getByPlaceholderText("apiPathPlaceholder")).toBeInTheDocument()
  })
})
