import { render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { JsonPreviewPanel } from "../JsonPreviewPanel"
import { FileItem } from "@/features/file-browser/types"
import { axiosInstance } from "@/lib/axios"
import { useSelectedFile } from "@/features/mock-api/hooks/useSelectedFile"

// Shiki 비동기 하이라이트를 우회하기 위해 CodeBlock을 단순 pre 태그로 모킹합니다.
jest.mock("../CodeBlock", () => ({
  CodeBlock: ({ code }: { code: string }) => <pre data-testid="code">{code}</pre>,
}))

jest.mock("@/lib/axios", () => {
  const instance = { get: jest.fn() }
  return { __esModule: true, default: instance, axiosInstance: instance }
})

jest.mock("@/features/mock-api/hooks/useSelectedFile", () => ({
  useSelectedFile: jest.fn(),
}))

// jsdom에는 EventSource가 없어 실제 훅을 그대로 두면 SSE 연결 시도로 테스트가 깨진다.
jest.mock("@/features/mock-api/hooks/useMockStateSSE", () => ({
  useMockStateSSE: jest.fn(),
}))

const mockedAxios = axiosInstance as jest.Mocked<typeof axiosInstance>
const mockedUseSelectedFile = useSelectedFile as jest.Mock

const defaultItem: FileItem = {
  id: "1",
  name: "users",
  itemType: "File",
  path: "/users",
  json: [{ id: 1 }],
  options: { pagination: false },
}

const renderPanel = (overrideItem?: Partial<FileItem>) => {
  const testItem = {
    ...defaultItem,
    ...overrideItem,
    options: {
      ...defaultItem.options,
      ...overrideItem?.options,
    },
  }
  mockedUseSelectedFile.mockReturnValue({ item: testItem, workspaceId: "ws1" })
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <JsonPreviewPanel />
    </QueryClientProvider>
  )
}

describe("JsonPreviewPanel", () => {
  beforeEach(() => {
    // 대부분의 테스트는 응답을 기다릴 필요가 없으므로 기본은 미해결 Promise로 둔다.
    // (placeholderData인 item.json이 즉시 렌더되므로 응답 없이도 검증 가능하다)
    mockedAxios.get.mockReturnValue(new Promise(() => {}))
  })

  it("서버 응답 전에는 item.json을 placeholder로 표시한다", () => {
    renderPanel()
    expect(screen.getByTestId("code").textContent).toContain('"id": 1')
  })
})

describe("FeatureBadge 조건부 표시", () => {
  beforeEach(() => {
    mockedAxios.get.mockReturnValue(new Promise(() => {}))
  })

  it("pagination이 켜진 아이템은 Pagination 뱃지를 표시한다", () => {
    renderPanel({
      options: {
        pagination: true,
        paginationParams: { pageParam: "p", limitParam: "size" },
      },
    })
    expect(screen.getByText(/Pagination: p \/ size/)).toBeInTheDocument()
  })

  it("sort가 켜진 아이템은 Sort 뱃지를 표시한다", () => {
    renderPanel({
      options: {
        pagination: false,
        sort: true,
        sortParams: { sortParam: "orderBy", orderParam: "direction" },
      },
    })
    expect(screen.getByText(/Sort: orderBy \/ direction/)).toBeInTheDocument()
  })

  it("search가 켜진 아이템은 Search 뱃지를 표시한다", () => {
    renderPanel({
      options: {
        pagination: false,
        search: true,
        searchParams: { searchParam: "keyword" },
      },
    })
    expect(screen.getByText(/Search: keyword/)).toBeInTheDocument()
  })

  it("모든 옵션이 꺼진 경우 뱃지가 표시되지 않는다", () => {
    renderPanel({ options: { pagination: false } })
    expect(screen.queryByText(/Pagination:/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Sort:/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Search:/)).not.toBeInTheDocument()
  })

  it("sort/search의 기본 파라미터명이 폴백으로 표시된다", () => {
    renderPanel({
      options: { pagination: false, sort: true, search: true },
    })
    expect(screen.getByText(/Sort: _sort \/ _order/)).toBeInTheDocument()
    expect(screen.getByText(/Search: q/)).toBeInTheDocument()
  })
})

describe("실시간 갱신", () => {
  it("서버 응답이 도착하면 effective JSON으로 교체한다", async () => {
    mockedAxios.get.mockResolvedValue({ data: [{ id: 1 }, { id: 99 }] })
    renderPanel()

    await waitFor(() =>
      expect(screen.getByTestId("code").textContent).toContain('"id": 99')
    )
  })
})
