// next-intl의 실제 동작을 모사한 목이다.
// - Link: href를 "로케일 없는 논리 경로"로 보고 접두사를 붙인다
// - usePathname: 접두사를 뗀 경로를 돌려준다
// 이 계약을 어기고 이미 접두사가 붙은 경로를 넘기면 href가 /en/en/... 이 된다.
jest.mock("@/i18n/routing", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={`/en${href}`}>{children}</a>
  ),
  usePathname: () => "/workspaces/ws1/apis",
}))

import { render } from "@testing-library/react"
import { WorkspaceSidebar } from "../WorkspaceSidebar"

jest.mock("next/navigation", () => ({
  useParams: () => ({ locale: "en", workspaceId: "ws1" }),
  usePathname: () => "/en/workspaces/ws1/apis",
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
  SidebarMenuButton: ({ children, tooltip, isActive }: any) => (
    <button aria-label={tooltip} data-active={isActive ? "true" : "false"}>
      {children}
    </button>
  ),
}))

describe("WorkspaceSidebar 로케일 접두사", () => {
  it("링크에 로케일 접두사가 한 번만 붙는다", () => {
    const { container } = render(<WorkspaceSidebar isOwner />)

    const hrefs = Array.from(container.querySelectorAll("a")).map((a) =>
      a.getAttribute("href")
    )

    expect(hrefs).toEqual([
      "/en/workspaces/ws1",
      "/en/workspaces/ws1/apis",
      "/en/workspaces/ws1/code",
      "/en/workspaces/ws1/mcp",
      "/en/workspaces/ws1/settings",
      "/en/workspaces",
    ])
  })

  it("현재 경로에 해당하는 메뉴만 활성으로 표시한다", () => {
    const { getByLabelText } = render(<WorkspaceSidebar isOwner />)

    expect(getByLabelText("Mock APIs")).toHaveAttribute("data-active", "true")
    expect(getByLabelText("Dashboard")).toHaveAttribute("data-active", "false")
    expect(getByLabelText("Code XML")).toHaveAttribute("data-active", "false")
  })
})
