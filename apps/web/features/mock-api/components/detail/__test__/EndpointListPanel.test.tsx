jest.mock("../CodeBlock", () => ({
  CodeBlock: ({ code }: { code: string }) => (
    <pre data-testid="request-body-code">{code}</pre>
  ),
}))

const mockPush = jest.fn()
jest.mock('@/i18n/routing', () => ({
  useRouter: () => ({ push: mockPush }),
}))

import { render, screen, fireEvent, act } from '@testing-library/react'
import { EndpointListPanel } from '../EndpointListPanel'
import { FileItem } from "@/features/file-browser/types"
import { useSelectedFile } from "@/features/mock-api/hooks/useSelectedFile"

const mutateMock = jest.fn()
jest.mock('@/features/mock-api/api/resetMockState', () => ({
  useResetMockState: () => ({ mutate: mutateMock, isPending: false }),
}))
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, string>) => {
    let text = key
    if (key === 'queryHintSort') {
      text = '정렬: ?{sortParam}={field}&{orderParam}=asc|desc'
    } else if (key === 'queryHintSearch') {
      text = '전문검색: ?{searchParam}=검색어'
    }
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, v)
      })
    }
    return text
  },
}))
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))
jest.mock('@/hooks/useWorkspaceBasePath', () => ({
  useWorkspaceBasePath: () => ({ basePath: '/workspaces/ws1' }),
}))
jest.mock('@/features/mock-api/hooks/useSelectedFile', () => ({
  useSelectedFile: jest.fn(),
}))

const mockedUseSelectedFile = useSelectedFile as jest.Mock

const defaultItem: FileItem = { id: 'item1', name: 'users', path: '/users', itemType: 'File' } as any

const renderPanel = (overrideItem?: Partial<FileItem>) => {
  const testItem = {
    ...defaultItem,
    ...overrideItem,
    options: {
      ...defaultItem.options,
      ...overrideItem?.options,
    },
  }
  mockedUseSelectedFile.mockReturnValue({ item: testItem, workspaceId: 'ws1' })
  return render(<EndpointListPanel />)
}

describe('EndpointListPanel', () => {
  beforeEach(() => {
    mutateMock.mockClear()
  })

  it('상태 초기화 버튼을 렌더한다', () => {
    renderPanel()
    expect(screen.getByText('resetState')).toBeInTheDocument()
  })

  it('초기화 확인 시 itemId로 mutate를 호출한다', () => {
    renderPanel()
    fireEvent.click(screen.getByText('resetState'))
    fireEvent.click(screen.getByText('resetConfirm'))
    expect(mutateMock).toHaveBeenCalledWith(
      { itemId: 'item1' },
      expect.any(Object),
    )
  })
})

describe('코드보기 버튼', () => {
  beforeEach(() => mockPush.mockClear())

  it('패널 전체에서 코드보기 버튼은 1개만 렌더된다', () => {
    renderPanel()
    expect(screen.getAllByText('viewCode')).toHaveLength(1)
  })

  it('코드보기 클릭 시 워크스페이스의 /code 경로로 이동한다', () => {
    renderPanel()
    fireEvent.click(screen.getByText('viewCode'))
    expect(mockPush).toHaveBeenCalledWith('/workspaces/ws1/code')
  })
})

describe("쿼리 힌트 조건부 표시", () => {
  it("sort 옵션이 켜진 아이템은 설정된 파라미터명으로 정렬 힌트를 보여준다", () => {
    renderPanel({
      options: {
        pagination: false,
        sort: true,
        sortParams: { sortParam: "orderBy", orderParam: "direction" },
      },
    })
    expect(screen.getByText(/\?orderBy=\{field\}&direction=asc\|desc/)).toBeInTheDocument()
  })

  it("search 옵션이 켜진 아이템은 검색 힌트를 보여준다", () => {
    renderPanel({
      options: {
        pagination: false,
        search: true,
        searchParams: { searchParam: "keyword" },
      },
    })
    expect(screen.getByText(/\?keyword=/)).toBeInTheDocument()
  })

  it("sort/search가 모두 꺼져 있으면 쿼리 힌트 박스를 렌더하지 않는다", () => {
    renderPanel({ options: { pagination: false } })
    expect(screen.queryByText(/쿼리 파라미터/)).not.toBeInTheDocument()
  })

  it("필터 힌트(?field=value)는 더 이상 표시되지 않는다", () => {
    renderPanel({
      options: { pagination: false, sort: true, search: true },
    })
    expect(screen.queryByText(/field=value/)).not.toBeInTheDocument()
  })
})

describe('EndpointRow URL 복사', () => {
  beforeAll(() => {
    Object.assign(navigator, {
      clipboard: { writeText: jest.fn().mockResolvedValue(undefined) },
    })
  })

  it('복사 직후 언마운트되면 대기 중이던 리셋 타이머가 정리된다', async () => {
    jest.useFakeTimers({ legacyFakeTimers: true })
    const { unmount } = renderPanel()

    // 엔드포인트 행마다 복사 버튼이 있으므로 첫 번째를 사용한다
    const copyButtons = screen.getAllByRole('button', { name: /copy/i })
    await act(async () => {
      fireEvent.click(copyButtons[0]!)
    })

    expect(jest.getTimerCount()).toBeGreaterThan(0)

    unmount()

    expect(jest.getTimerCount()).toBe(0)
    jest.useRealTimers()
  })
})

describe("PATCH 엔드포인트", () => {
  it("PATCH 행을 PUT과 DELETE 사이에 추가한다", () => {
    renderPanel()
    const methodBadges = screen.getAllByText(/^(GET|POST|PUT|PATCH|DELETE)$/)
    expect(methodBadges.map((el) => el.textContent)).toEqual([
      "GET",
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
    ])
    expect(screen.getByText("descPatch")).toBeInTheDocument()
  })

  it("PATCH의 URL은 PUT과 동일한 :id 패턴을 사용한다", () => {
    renderPanel()
    const patchRow = screen.getByText("descPatch").closest("div.rounded-lg")
    expect(patchRow).not.toBeNull()
    expect(patchRow!.textContent).toContain("/users/:id")
  })
})

describe("Request Body 미리보기", () => {
  it("fields 기준으로 id를 제외한 필드를 빈 문자열 값으로 보여준다", () => {
    renderPanel({
      fields: [
        { id: "f1", name: "id", type: "uuid" },
        { id: "f2", name: "title", type: "string" },
        { id: "f3", name: "price", type: "number" },
      ],
    })
    const bodyCode = screen.getByTestId("request-body-code")
    expect(JSON.parse(bodyCode.textContent!)).toEqual({ title: "", price: "" })
  })

  it("단일 객체(resourceType: 'object')에서는 사용자 id 필드도 Request Body에 포함된다", () => {
    renderPanel({
      options: { resourceType: "object", pagination: false, sort: false, search: false },
      fields: [
        { id: "f1", name: "id", type: "string" },
        { id: "f2", name: "title", type: "string" },
      ],
    })
    const bodyCode = screen.getByTestId("request-body-code")
    expect(JSON.parse(bodyCode.textContent!)).toEqual({ id: "", title: "" })
  })

  it("id 외 필드가 없으면 빈 객체를 보여준다", () => {
    renderPanel({ fields: [] })
    const bodyCode = screen.getByTestId("request-body-code")
    expect(JSON.parse(bodyCode.textContent!)).toEqual({})
  })

  it("Request Body 제목을 렌더한다", () => {
    renderPanel()
    expect(screen.getByText("requestBodyTitle")).toBeInTheDocument()
  })
})

