import { render, screen, fireEvent } from "@testing-library/react"
import { CodeGenPanel } from "../CodeGenPanel"
import { FileItem } from "@/features/file-browser/types"
import { useSelectedFile } from "@/features/mock-api/hooks/useSelectedFile"

// Shiki 비동기 하이라이트를 우회하기 위해 CodeBlock을 단순 pre 태그로 모킹합니다.
jest.mock("@/features/mock-api/components/detail/CodeBlock", () => ({
  CodeBlock: ({ code }: { code: string }) => (
    <pre data-testid="code">{code}</pre>
  ),
}))
jest.mock("@/features/mock-api/hooks/useSelectedFile", () => ({
  useSelectedFile: jest.fn(),
}))

// Radix Select 렌더에 필요한 ResizeObserver 폴리필 (jsdom에는 없음)
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
;(global as any).ResizeObserver = ResizeObserverStub

const mockedUseSelectedFile = useSelectedFile as jest.Mock

const item: FileItem = {
  id: "1",
  name: "users",
  itemType: "File",
  path: "/users",
  schema: { name: "string" },
  json: [],
  options: { pagination: false },
}

const renderPanel = (overrideItem?: Partial<FileItem>) => {
  mockedUseSelectedFile.mockReturnValue({
    item: { ...item, ...overrideItem },
    workspaceId: "ws1",
  })
  return render(<CodeGenPanel />)
}

/** 메인 탭을 라벨로 클릭한다 */
const clickTab = (name: string) => {
  const tab = screen.getByRole("tab", { name })
  fireEvent.mouseDown(tab, { button: 0 })
  fireEvent.click(tab)
}

describe("CodeGenPanel 탭 구조", () => {
  it("Validation/Client/Query 세 개의 메인 탭을 렌더링한다", () => {
    renderPanel()
    expect(screen.getByRole("tab", { name: "Validation Schema" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "API Client" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "TanStack Query Hooks" })).toBeInTheDocument()
  })

  it("한 번에 하나의 코드 블록만 노출한다", () => {
    renderPanel()
    expect(screen.getAllByTestId("code")).toHaveLength(1)
  })

  it("기본 탭은 Validation Schema이며 zod 코드가 표시된다", () => {
    renderPanel()
    expect(screen.getByTestId("code").textContent).toContain("z.infer")
  })

  it("API Client 탭으로 전환하면 axios 코드가 표시된다", () => {
    renderPanel()
    clickTab("API Client")
    expect(screen.getByTestId("code").textContent).toContain("axios.create")
  })

  it("TanStack Query Hooks 탭으로 전환하면 useQuery 코드가 표시된다", () => {
    renderPanel()
    clickTab("TanStack Query Hooks")
    expect(screen.getByTestId("code").textContent).toContain("useQuery")
  })
})

describe("아이템 옵션 기반 쿼리 코드 생성", () => {
  it("sort 옵션이 켜진 아이템은 설정된 파라미터명이 API Client 코드에 포함된다", () => {
    renderPanel({
      options: {
        pagination: false,
        sort: true,
        sortParams: { sortParam: "orderBy", orderParam: "direction" },
      },
    })
    clickTab("API Client")
    expect(screen.getByTestId("code").textContent).toContain("orderBy")
  })

  it("sort/search가 꺼진 아이템은 API Client 코드에 ListQuery 타입이 없다", () => {
    renderPanel({ options: { pagination: false } })
    clickTab("API Client")
    expect(screen.getByTestId("code").textContent).not.toContain("ListQuery")
  })

  it("Query params 체크박스는 더 이상 표시되지 않는다", () => {
    renderPanel({ options: { pagination: false } })
    expect(screen.queryByText(/Query params/)).not.toBeInTheDocument()
  })
})
