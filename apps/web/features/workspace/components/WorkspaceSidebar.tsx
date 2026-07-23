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
import { Settings, LayoutDashboard, LogOut, CodeXml, Route, Plug } from "lucide-react"
import { WorkspaceSwitcher } from "./WorkspaceSwitcher"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useWorkspaceBasePath } from "@/hooks/useWorkspaceBasePath"

interface WorkspaceSidebarProps {
  isOwner?: boolean
}

export function WorkspaceSidebar({ isOwner = false }: WorkspaceSidebarProps) {
  const pathname = usePathname()
  const { basePath, lobbyPath } = useWorkspaceBasePath()

  // 활성화 판정 로직
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
              tooltip="Dashboard"
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
              tooltip="Mock APIs"
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
              tooltip="Code XML"
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
              tooltip="MCP"
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
        <SidebarMenu className="items-center">
          {isOwner && (
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Settings"
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
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Exit Workspace"
              className="h-10 w-10 justify-center"
              asChild
            >
              <Link href={lobbyPath}>
                <LogOut size={20} />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
