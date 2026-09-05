jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}))

// TreeActionButtons가 사용하는 Tooltip은 TooltipProvider 컨텍스트가 필요하다.
// TreeActionButtons.test.tsx와 동일한 방식으로 모킹한다.
jest.mock("@workspace/ui/components/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

const mockTreeCreate = jest.fn()
jest.mock("../FileTree", () => ({
  FileTree: ({ treeRef }: { treeRef?: React.MutableRefObject<any> }) => {
    if (treeRef) {
      treeRef.current = { create: mockTreeCreate }
    }
    return <div data-testid="file-tree" />
  },
}))
jest.mock("@/hooks/useWorkspaceBasePath", () => ({
  useWorkspaceBasePath: () => ({
    workspaceId: "ws1",
    basePath: "/workspaces/ws1",
  }),
}))
jest.mock("@/hooks/useMyPermissions", () => ({
  useMyPermissions: () => ({ canCreate: true, canUpdate: true, canDelete: true }),
}))
// 마운트 여부를 DOM으로 판정해야 하므로 마커를 그린다. () => null이면
// 마운트돼도 화면에 흔적이 없어 지연 마운트를 검증할 수 없다.
jest.mock("@/features/mock-api/components/create/CreateMockApiDialog", () => ({
  CreateMockApiDialog: () => <div data-testid="create-mock-api-dialog" />,
}))

// jest.mock 팩토리는 최상단으로 끌어올려지므로 바깥 변수를 참조하려면
// 이름이 `mock`으로 시작해야 한다 (Jest 제약).
let mockDialogIsOpen = false
jest.mock("@/features/mock-api/hooks/useMockApiDialog", () => ({
  useMockApiDialog: () => ({
    isOpen: mockDialogIsOpen,
    openCreate: jest.fn(),
    openEdit: jest.fn(),
    close: jest.fn(),
    onSubmit: jest.fn(),
    parentPath: "/",
    editTarget: null,
  }),
}))

import { render, screen, fireEvent } from "@testing-library/react"
import { ApisExplorer } from "../ApisExplorer"

describe("ApisExplorer 루트 폴더 생성", () => {
  beforeEach(() => {
    mockTreeCreate.mockClear()
  })

  it("폴더 생성 버튼을 누르면 FileTree의 create({ parentId: null, index: 0, type: 'internal' })가 호출된다", () => {
    render(<ApisExplorer />)
    // TreeActionButtons의 폴더 생성 버튼. 아이콘 전용이므로 첫 번째 버튼을 사용한다
    fireEvent.click(screen.getAllByRole("button")[0]!)

    expect(mockTreeCreate).toHaveBeenCalledWith({
      parentId: null,
      index: 0,
      type: "internal",
    })
  })
})

describe("ApisExplorer 다이얼로그 지연 마운트", () => {
  afterEach(() => {
    mockDialogIsOpen = false
  })

  it("닫혀 있으면 다이얼로그를 마운트하지 않는다", () => {
    // 마운트하면 faker가 딸려 와 초기 번들에 약 194KB(gzip)가 얹힌다
    mockDialogIsOpen = false

    render(<ApisExplorer />)

    expect(
      screen.queryByTestId("create-mock-api-dialog"),
    ).not.toBeInTheDocument()
  })

  it("열리면 다이얼로그를 마운트한다", async () => {
    mockDialogIsOpen = true

    render(<ApisExplorer />)

    // next/dynamic은 비동기로 해석되므로 findBy로 기다린다
    expect(
      await screen.findByTestId("create-mock-api-dialog"),
    ).toBeInTheDocument()
  })
})
