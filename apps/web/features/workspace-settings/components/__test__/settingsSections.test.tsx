const mockUseGetWorkspace = jest.fn()
const mockUseUpdateWorkspace = jest.fn()
const mockUseMembers = jest.fn()
const mockUseRemoveMember = jest.fn()
const mockUseRoles = jest.fn()
const mockUseUpdateRole = jest.fn()

jest.mock("@/features/workspace/api/getWorkspace", () => ({
  useGetWorkspace: (...a: unknown[]) => mockUseGetWorkspace(...a),
}))
jest.mock("@/features/workspace/api/updateWorkspace", () => ({
  useUpdateWorkspace: (...a: unknown[]) => mockUseUpdateWorkspace(...a),
}))
jest.mock("../../api/members", () => ({
  useMembers: (...a: unknown[]) => mockUseMembers(...a),
  useRemoveMember: (...a: unknown[]) => mockUseRemoveMember(...a),
}))
jest.mock("../../api/roles", () => ({
  useRoles: (...a: unknown[]) => mockUseRoles(...a),
  useUpdateRole: (...a: unknown[]) => mockUseUpdateRole(...a),
}))
// 번역 키를 그대로 돌려준다 — 문구가 바뀌어도 테스트가 깨지지 않는다
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useFormatter: () => ({ dateTime: (date: Date) => date.toISOString() }),
}))
jest.mock("sonner", () => ({ toast: { success: jest.fn() } }))
jest.mock("@workspace/ui/components/checkbox", () => ({
  Checkbox: ({ id, checked, onCheckedChange }: any) => (
    <input
      type="checkbox"
      id={id}
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
    />
  ),
}))

import { render, screen, fireEvent } from "@testing-library/react"
import { GeneralSettingsSection } from "../GeneralSettingsSection"
import { MembersSection } from "../MembersSection"
import { PermissionsSection } from "../PermissionsSection"

const idleMutation = { mutate: jest.fn(), isPending: false }

const query = (over: Record<string, unknown> = {}) => ({
  data: undefined,
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
  ...over,
})

beforeEach(() => {
  mockUseUpdateWorkspace.mockReturnValue(idleMutation)
  mockUseRemoveMember.mockReturnValue(idleMutation)
  mockUseUpdateRole.mockReturnValue(idleMutation)
  mockUseGetWorkspace.mockReturnValue(query())
  mockUseMembers.mockReturnValue(query({ data: [] }))
  mockUseRoles.mockReturnValue(query({ data: [] }))
})

describe("GeneralSettingsSection", () => {
  it("조회에 실패하면 실패 문구와 재시도 버튼을 보여준다", () => {
    mockUseGetWorkspace.mockReturnValue(query({ isError: true }))
    render(<GeneralSettingsSection workspaceId="ws1" />)

    expect(screen.getByText("loadFailed")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "retry" })).toBeInTheDocument()
  })

  it("조회에 실패하면 이름 입력 폼을 보여주지 않는다", () => {
    // 빈 폼을 보여주면 "이름이 지워졌다"고 오인한다
    mockUseGetWorkspace.mockReturnValue(query({ isError: true }))
    render(<GeneralSettingsSection workspaceId="ws1" />)

    expect(screen.queryByLabelText("nameLabel")).not.toBeInTheDocument()
  })

  it("재시도 버튼을 누르면 refetch를 호출한다", () => {
    const refetch = jest.fn()
    mockUseGetWorkspace.mockReturnValue(query({ isError: true, refetch }))
    render(<GeneralSettingsSection workspaceId="ws1" />)

    fireEvent.click(screen.getByRole("button", { name: "retry" }))

    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it("정상 조회 시 워크스페이스 이름을 폼에 채운다", () => {
    mockUseGetWorkspace.mockReturnValue(query({ data: { name: "내 작업실" } }))
    render(<GeneralSettingsSection workspaceId="ws1" />)

    expect(screen.getByDisplayValue("내 작업실")).toBeInTheDocument()
  })
})

describe("MembersSection", () => {
  it("조회에 실패하면 실패 문구와 재시도 버튼을 보여준다", () => {
    mockUseMembers.mockReturnValue(query({ isError: true }))
    render(<MembersSection workspaceId="ws1" />)

    expect(screen.getByText("loadFailed")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "retry" })).toBeInTheDocument()
  })

  it("조회에 실패하면 빈 테이블을 보여주지 않는다", () => {
    mockUseMembers.mockReturnValue(query({ isError: true }))
    render(<MembersSection workspaceId="ws1" />)

    expect(screen.queryByRole("table")).not.toBeInTheDocument()
  })

  it("owner 행에는 추방 버튼을 노출하지 않는다", () => {
    mockUseMembers.mockReturnValue(
      query({
        data: [
          { id: "m1", userId: "u1", nickname: "주인", email: "o@b.com", role: "owner" },
        ],
      })
    )
    render(<MembersSection workspaceId="ws1" />)

    expect(screen.queryByRole("button", { name: "remove" })).not.toBeInTheDocument()
  })

  it("member 행에는 추방 버튼을 노출한다", () => {
    mockUseMembers.mockReturnValue(
      query({
        data: [
          { id: "m2", userId: "u2", nickname: "멤버", email: "m@b.com", role: "member" },
        ],
      })
    )
    render(<MembersSection workspaceId="ws1" />)

    expect(screen.getByRole("button", { name: "remove" })).toBeInTheDocument()
  })
})

describe("PermissionsSection", () => {
  const memberRole = {
    id: "r1",
    role: "member",
    canCreate: true,
    canRename: false,
    canMove: false,
    canDelete: false,
    canUpdate: true,
  }

  it("조회에 실패하면 실패 문구와 재시도 버튼을 보여준다", () => {
    mockUseRoles.mockReturnValue(query({ isError: true }))
    render(<PermissionsSection workspaceId="ws1" />)

    expect(screen.getByText("loadFailed")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "retry" })).toBeInTheDocument()
  })

  it("조회 실패 시 스켈레톤이 영구히 남지 않는다", () => {
    // isError를 isLoading보다 나중에 보면 memberRole이 undefined로 남아
    // 로딩이 끝났는데도 스켈레톤이 계속 표시된다 (과거 버그)
    mockUseRoles.mockReturnValue(query({ isError: true }))
    render(<PermissionsSection workspaceId="ws1" />)

    expect(screen.getByText("loadFailed")).toBeInTheDocument()
  })

  it("member 역할의 권한 값을 체크박스에 반영한다", () => {
    mockUseRoles.mockReturnValue(query({ data: [memberRole] }))
    render(<PermissionsSection workspaceId="ws1" />)

    expect(screen.getByLabelText("canCreate.label")).toBeChecked()
    expect(screen.getByLabelText("canDelete.label")).not.toBeChecked()
  })

  it("변경 전에는 저장 버튼이 비활성 상태다", () => {
    mockUseRoles.mockReturnValue(query({ data: [memberRole] }))
    render(<PermissionsSection workspaceId="ws1" />)

    expect(screen.getByRole("button", { name: "save" })).toBeDisabled()
  })
})
