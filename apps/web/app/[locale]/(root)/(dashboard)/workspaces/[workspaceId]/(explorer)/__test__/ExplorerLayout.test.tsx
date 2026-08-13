import { render } from "@testing-library/react"
import ExplorerLayout from "../layout"

// ApisExplorer 컴포넌트 모킹
jest.mock("@/features/file-browser/components/ApisExplorer", () => ({
  ApisExplorer: () => <div data-testid="apis-explorer">Sidebar</div>,
}))

describe("ExplorerLayout 공통 패딩", () => {
  it("메인 스크롤 컨테이너에 하단 패딩(pb-8) 클래스가 적용되어 있다", () => {
    const { container } = render(
      <ExplorerLayout>
        <div data-testid="child-content">Content</div>
      </ExplorerLayout>
    )

    const mainContainer = container.querySelector(".overflow-y-auto")
    expect(mainContainer).toBeInTheDocument()
    expect(mainContainer).toHaveClass("pb-8")
  })
})
