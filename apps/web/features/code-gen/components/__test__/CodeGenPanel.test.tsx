import { render, screen } from "@testing-library/react"
import { CodeGenPanel } from "../CodeGenPanel"
import { FileItem } from "@/features/file-browser/types"

// Shiki 비동기 하이라이트를 우회하기 위해 CodeBlock을 단순 pre 태그로 모킹합니다.
jest.mock("@/features/mock-api/components/detail/CodeBlock", () => ({
  CodeBlock: ({ code }: { code: string }) => (
    <pre data-testid="code">{code}</pre>
  ),
}))

const item: FileItem = {
  id: "1",
  name: "users",
  itemType: "File",
  path: "/users",
  schema: { name: "string" },
  json: [],
  options: { pagination: false },
}

describe("CodeGenPanel 렌더링", () => {
  it("Validation/Client/Query 세 섹션을 렌더링한다", () => {
    render(<CodeGenPanel item={item} workspaceId="ws1" />)
    expect(screen.getByText("Validation Schema")).toBeInTheDocument()
    expect(screen.getByText("API Client")).toBeInTheDocument()
    expect(screen.getByText("TanStack Query Hooks")).toBeInTheDocument()
  })

  it("기본 상태에서 TypeScript zod 코드가 표시된다", () => {
    render(<CodeGenPanel item={item} workspaceId="ws1" />)
    const blocks = screen.getAllByTestId("code")
    expect(blocks[0]?.textContent).toContain("z.infer")
    expect(blocks[1]?.textContent).toContain("axios.create")
    expect(blocks[2]?.textContent).toContain("useQuery")
  })
})
