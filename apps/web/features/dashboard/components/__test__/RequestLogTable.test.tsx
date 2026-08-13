const mockUseGetRequestLogs = jest.fn()
jest.mock("../../api/getRequestLogs", () => ({
  useGetRequestLogs: (...args: unknown[]) => mockUseGetRequestLogs(...args),
  REQUEST_LOGS_PAGE_SIZE: 20,
}))
jest.mock("next-intl", () => ({
  useLocale: () => "ko",
  useFormatter: () => ({
    dateTime: (date: Date) => date.toISOString(),
  }),
}))

import { render, screen, fireEvent } from "@testing-library/react"
import { RequestLogTable } from "../RequestLogTable"

const log = (over: Record<string, unknown> = {}) => ({
  id: "l1",
  method: "GET",
  path: "/users",
  status: 200,
  ip: "127.0.0.1",
  createdAt: "2026-08-01T00:00:00.000Z",
  ...over,
})

const meta = (over: Record<string, unknown> = {}) => ({
  page: 1,
  totalPages: 1,
  totalItems: 1,
  hasPrev: false,
  hasNext: false,
  ...over,
})

const setQueryState = (state: Record<string, unknown>) => {
  mockUseGetRequestLogs.mockReturnValue({
    data: undefined,
    isPending: false,
    isError: false,
    refetch: jest.fn(),
    ...state,
  })
}

describe("RequestLogTable", () => {
  beforeEach(() => {
    mockUseGetRequestLogs.mockReset()
  })

  it("로딩 중에는 빈 상태 문구를 보여주지 않는다", () => {
    setQueryState({ isPending: true })
    render(<RequestLogTable workspaceId="ws1" />)

    expect(screen.queryByText("No requests logged yet")).not.toBeInTheDocument()
    expect(screen.queryByText("Failed to load requests")).not.toBeInTheDocument()
  })

  it("조회에 실패하면 실패 문구와 재시도 버튼을 보여준다", () => {
    setQueryState({ isError: true })
    render(<RequestLogTable workspaceId="ws1" />)

    expect(screen.getByText("Failed to load requests")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument()
  })

  it("실패를 '로그 없음'으로 위장하지 않는다", () => {
    // 이 단언이 이 파일의 핵심이다. data가 undefined라는 이유로
    // 빈 상태 문구가 나오면 장애가 정상 상태로 오인된다.
    setQueryState({ isError: true })
    render(<RequestLogTable workspaceId="ws1" />)

    expect(screen.queryByText("No requests logged yet")).not.toBeInTheDocument()
  })

  it("재시도 버튼을 누르면 refetch를 호출한다", () => {
    const refetch = jest.fn()
    setQueryState({ isError: true, refetch })
    render(<RequestLogTable workspaceId="ws1" />)

    fireEvent.click(screen.getByRole("button", { name: "Retry" }))

    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it("로그가 0건이면 빈 상태 문구를 보여준다", () => {
    setQueryState({ data: { data: [], meta: meta({ totalItems: 0 }) } })
    render(<RequestLogTable workspaceId="ws1" />)

    expect(screen.getByText("No requests logged yet")).toBeInTheDocument()
  })

  it("로그를 메소드·경로·IP와 함께 렌더한다", () => {
    setQueryState({
      data: { data: [log({ method: "POST", path: "/orders" })], meta: meta() },
    })
    render(<RequestLogTable workspaceId="ws1" />)

    expect(screen.getByText("POST")).toBeInTheDocument()
    expect(screen.getByText("/orders")).toBeInTheDocument()
    expect(screen.getByText("127.0.0.1")).toBeInTheDocument()
  })

  it("IP가 없으면 '-'로 표기한다", () => {
    setQueryState({ data: { data: [log({ ip: null })], meta: meta() } })
    render(<RequestLogTable workspaceId="ws1" />)

    expect(screen.getByText("-")).toBeInTheDocument()
  })

  it("404 로그에는 상태 배지를 덧붙인다", () => {
    setQueryState({ data: { data: [log({ status: 404 })], meta: meta() } })
    render(<RequestLogTable workspaceId="ws1" />)

    expect(screen.getByText("404")).toBeInTheDocument()
  })

  it("전체 건수가 한 페이지 이하면 페이지네이션을 숨긴다", () => {
    setQueryState({ data: { data: [log()], meta: meta({ totalItems: 20 }) } })
    render(<RequestLogTable workspaceId="ws1" />)

    expect(screen.queryByText(/Page \d+ of \d+/)).not.toBeInTheDocument()
  })

  it("다음 페이지 버튼을 누르면 page를 올려 재조회한다", () => {
    setQueryState({
      data: {
        data: [log()],
        meta: meta({ totalItems: 45, totalPages: 3, hasNext: true }),
      },
    })
    render(<RequestLogTable workspaceId="ws1" />)

    // 페이지네이션 영역의 두 번째 아이콘 버튼이 "다음"이다
    const buttons = screen.getAllByRole("button")
    fireEvent.click(buttons[buttons.length - 1]!)

    expect(mockUseGetRequestLogs).toHaveBeenLastCalledWith("ws1", 2)
  })
})
