import { render, screen, fireEvent } from "@testing-library/react"
import { CodeGenToolbar } from "../CodeGenToolbar"

// Radix Select 렌더에 필요한 ResizeObserver 폴리필 (jsdom에는 없음)
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
;(global as any).ResizeObserver = ResizeObserverStub

const renderToolbar = (overrides?: Partial<Parameters<typeof CodeGenToolbar>[0]>) => {
  const props = {
    lang: "ts" as const,
    onLangChange: jest.fn(),
    validationLib: "zod" as const,
    onValidationLibChange: jest.fn(),
    clientLib: "axios" as const,
    onClientLibChange: jest.fn(),
    ...overrides,
  }
  return { props, ...render(<CodeGenToolbar {...props} />) }
}

describe("CodeGenToolbar", () => {
  it("언어 탭과 두 개의 라이브러리 선택 컨트롤을 한 줄에 렌더한다", () => {
    renderToolbar()
    expect(screen.getByRole("tab", { name: "TypeScript" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "JavaScript" })).toBeInTheDocument()
    expect(screen.getByLabelText("Validation library")).toBeInTheDocument()
    expect(screen.getByLabelText("HTTP client")).toBeInTheDocument()
  })

  it("현재 선택된 언어 탭이 활성 상태로 표시된다", () => {
    renderToolbar({ lang: "js" })
    expect(screen.getByRole("tab", { name: "JavaScript" })).toHaveAttribute(
      "data-state",
      "active",
    )
    expect(screen.getByRole("tab", { name: "TypeScript" })).toHaveAttribute(
      "data-state",
      "inactive",
    )
  })

  it("다른 언어 탭을 클릭하면 onLangChange를 해당 값으로 호출한다", () => {
    const { props } = renderToolbar()
    const tab = screen.getByRole("tab", { name: "JavaScript" })
    fireEvent.mouseDown(tab, { button: 0 })
    fireEvent.click(tab)
    expect(props.onLangChange).toHaveBeenCalledWith("js")
  })
})
