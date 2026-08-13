jest.mock("@/i18n/routing", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
  usePathname: () => "/workspaces/ws1",
}))

import { render, screen } from "@testing-library/react"
import { WorkspaceSidebar } from "../WorkspaceSidebar"

// 라우팅 훅과 무거운 하위 컴포넌트를 목킹해 노출 조건만 검증한다
jest.mock("next/navigation", () => ({
  useParams: () => ({ locale: "ko", workspaceId: "ws1" }),
}))
jest.mock("../WorkspaceSwitcher", () => ({
  WorkspaceSwitcher: () => <div data-testid="switcher" />,
}))
jest.mock("@workspace/ui/components/sidebar", () => ({
  Sidebar: ({ children }: any) => <div>{children}</div>,
  SidebarContent: ({ children }: any) => <div>{children}</div>,
  SidebarHeader: ({ children }: any) => <div>{children}</div>,
  SidebarFooter: ({ children }: any) => <div>{children}</div>,
  SidebarMenu: ({ children }: any) => <ul>{children}</ul>,
  SidebarMenuItem: ({ children }: any) => <li>{children}</li>,
  SidebarMenuButton: ({ children, tooltip }: any) => (
    <button aria-label={tooltip}>{children}</button>
  ),
}))

describe("WorkspaceSidebar Settings 노출", () => {
  it("owner이면 Settings 메뉴가 보인다", () => {
    render(<WorkspaceSidebar isOwner />)
    expect(screen.getByLabelText("Settings")).toBeInTheDocument()
  })

  it("member(비 owner)이면 Settings 메뉴가 보이지 않는다", () => {
    render(<WorkspaceSidebar isOwner={false} />)
    expect(screen.queryByLabelText("Settings")).not.toBeInTheDocument()
  })
})
