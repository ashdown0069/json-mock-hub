"use client"

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenu,
} from "@workspace/ui/components/sidebar"
import {
  Settings,
  LayoutDashboard,
  LogOut,
  CodeXml,
  Route,
  Plug,
  Loader2,
  Undo2,
} from "lucide-react"
import { WorkspaceSwitcher } from "./WorkspaceSwitcher"
import { Link, usePathname } from "@/i18n/routing"
import { useWorkspaceBasePath } from "@/hooks/useWorkspaceBasePath"
import { useLogout } from "@/features/auth/api/logoutService"
import { useTranslations } from "next-intl"

interface WorkspaceSidebarProps {
  isOwner?: boolean
}

export function WorkspaceSidebar({ isOwner = false }: WorkspaceSidebarProps) {
  // next-intl의 usePathname은 로케일 접두사를 뗀 경로를 돌려주므로
  // 논리 경로인 basePath와 같은 좌표계에서 비교할 수 있다.
  const pathname = usePathname()
  const { basePath, lobbyPath } = useWorkspaceBasePath()
  const { mutate: handleLogout, isPending: isLoggingOut } = useLogout()
  const t = useTranslations("WorkspaceSidebar")

  const isDashboardActive = pathname === basePath
  const isApisActive = pathname.startsWith(`${basePath}/apis`)
  const isCodeActive = pathname.startsWith(`${basePath}/code`)
  const isMcpActive = pathname.startsWith(`${basePath}/mcp`)
  const isSettingsActive = pathname.startsWith(`${basePath}/settings`)

  return (
    <Sidebar
      collapsible="none"
      className="h-screen w-[4rem] border-r bg-sidebar"
    >
      <SidebarHeader className="flex items-center justify-center py-4">
        <WorkspaceSwitcher />
      </SidebarHeader>
      <SidebarContent className="flex items-center pt-4">
        <SidebarMenu className="items-center gap-4">
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={t("dashboard")}
              className="h-10 w-10 justify-center"
              isActive={isDashboardActive}
              asChild
            >
              <Link href={basePath}>
                <LayoutDashboard size={20} />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={t("mockApis")}
              className="h-10 w-10 justify-center"
              isActive={isApisActive}
              asChild
            >
              <Link href={`${basePath}/apis`}>
                <Route size={20} />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={t("code")}
              className="h-10 w-10 justify-center"
              isActive={isCodeActive}
              asChild
            >
              <Link href={`${basePath}/code`}>
                <CodeXml size={20} />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={t("mcp")}
              className="h-10 w-10 justify-center"
              isActive={isMcpActive}
              asChild
            >
              <Link href={`${basePath}/mcp`}>
                <Plug size={20} />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="flex items-center pb-4">
        <SidebarMenu className="items-center gap-2">
          {isOwner && (
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip={t("settings")}
                className="h-10 w-10 justify-center"
                isActive={isSettingsActive}
                asChild
              >
                <Link href={`${basePath}/settings`}>
                  <Settings size={20} />
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          {/* 1. 워크스페이스 로비(/workspaces)로 돌아가기 버튼 */}
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={t("backToWorkspaces")}
              className="h-10 w-10 justify-center"
              asChild
            >
              <Link href={lobbyPath}>
                <Undo2 size={20} />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {/* 2. 실제 계정 로그아웃 버튼 */}
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={t("logout")}
              className="h-10 w-10 cursor-pointer justify-center text-muted-foreground hover:text-destructive"
              onClick={() => handleLogout()}
              disabled={isLoggingOut}
              aria-label={t("logout")}
            >
              {isLoggingOut ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <LogOut size={20} />
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
