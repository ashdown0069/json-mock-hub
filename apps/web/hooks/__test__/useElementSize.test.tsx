import { act, render, screen } from "@testing-library/react"
import { useElementSize } from "../useElementSize"

type ObserverCallback = (entries: { contentRect: DOMRectReadOnly }[]) => void

let callbacks: ObserverCallback[] = []
let observed: Element[] = []
const disconnect = jest.fn()

class ResizeObserverStub {
  constructor(callback: ObserverCallback) {
    callbacks.push(callback)
  }
  observe(element: Element) {
    observed.push(element)
  }
  unobserve() {}
  disconnect = disconnect
}

const notify = (width: number, height: number) =>
  act(() => {
    callbacks.forEach((cb) =>
      cb([{ contentRect: { width, height } as DOMRectReadOnly }])
    )
  })

beforeEach(() => {
  callbacks = []
  observed = []
  disconnect.mockClear()
  ;(global as unknown as { ResizeObserver: unknown }).ResizeObserver =
    ResizeObserverStub
})

/**
 * FileTreeBody와 동일한 구조를 가진 테스트용 컴포넌트.
 * 로딩 분기는 ref가 붙지 않은 다른 DOM을 early-return하고,
 * 데이터가 준비된 뒤에야 관측 대상 컨테이너를 렌더한다.
 */
function Panel({ loading }: { loading: boolean }) {
  const { ref, width, height } = useElementSize<HTMLDivElement>()

  if (loading) return <div data-testid="loading">Loading...</div>

  return (
    <div ref={ref} data-testid="container">
      {width > 0 && height > 0 ? <span data-testid="tree">tree</span> : null}
    </div>
  )
}

describe("useElementSize", () => {
  it("측정 전 초기 크기는 0이다", () => {
    render(<Panel loading={false} />)

    expect(screen.queryByTestId("tree")).not.toBeInTheDocument()
  })

  it("요소가 연결되면 ResizeObserver가 알려준 크기를 반영한다", () => {
    render(<Panel loading={false} />)

    expect(observed).toContain(screen.getByTestId("container"))

    notify(284, 640)

    expect(screen.getByTestId("tree")).toBeInTheDocument()
  })

  it("언마운트 시 observer를 정리한다", () => {
    const { unmount } = render(<Panel loading={false} />)

    unmount()

    expect(disconnect).toHaveBeenCalled()
  })

  // 회귀 방지: 관측 대상이 첫 커밋에 없으면 관측이 영영 시작되지 않아
  // APIs Explorer 트리가 통째로 빈 채로 남았다.
  it("로딩 분기가 먼저 커밋돼도 이후 나타난 컨테이너를 관측한다", () => {
    const { rerender } = render(<Panel loading={true} />)
    expect(screen.getByTestId("loading")).toBeInTheDocument()

    // 데이터 도착 → 관측 대상 컨테이너가 처음으로 DOM에 붙는다
    rerender(<Panel loading={false} />)

    expect(observed).toContain(screen.getByTestId("container"))

    notify(284, 640)

    expect(screen.getByTestId("tree")).toBeInTheDocument()
  })

  it("컨테이너가 언마운트 후 재마운트돼도 크기를 다시 반영한다", () => {
    const { rerender } = render(<Panel loading={false} />)
    notify(284, 640)
    expect(screen.getByTestId("tree")).toBeInTheDocument()

    // 재조회 실패 등으로 컨테이너가 사라졌다가
    rerender(<Panel loading={true} />)
    // 복구되면 새 노드를 다시 관측해야 한다
    rerender(<Panel loading={false} />)

    // 복구된 컨테이너가 관측 대상으로 다시 등록돼야 한다
    expect(observed.at(-1)).toBe(screen.getByTestId("container"))

    notify(284, 640)

    expect(screen.getByTestId("tree")).toBeInTheDocument()
  })
})
