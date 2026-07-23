"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Check, Plus, PanelLeftOpen, Loader2 } from "lucide-react"
import { useGetWorkspaceList } from "../api/getWorkspaceList"
import { useWorkspaceBasePath } from "@/hooks/useWorkspaceBasePath"
import { localePath } from "@/lib/localePath"

export function WorkspaceSwitcher() {
  const params = useParams()
  const workspaceId = (params.workspaceId as string) || ""
  const { basePath, lobbyPath, locale } = useWorkspaceBasePath()
  const { data: workspaces, isLoading } = useGetWorkspaceList()

  // localePath를 사용하여 안전하게 워크스페이스 경로 생성
  const buildWorkspacePath = (wsId: string) => {
    return localePath(locale, "/workspaces/" + wsId)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg transition-colors outline-none hover:bg-primary/20">
          <PanelLeftOpen size={18} />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side="right"
        sideOffset={12}
        className="w-56"
      >
        <DropdownMenuLabel>Switch Workspace</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 size={16} className="animate-spin text-muted-foreground" />
          </div>
        ) : !workspaces || workspaces.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No workspaces found
          </div>
        ) : (
          workspaces.map((workspace) => (
            <DropdownMenuItem key={workspace.id} asChild>
              <Link
                href={buildWorkspacePath(workspace.id)}
                className="flex w-full cursor-pointer items-center justify-between"
              >
                {workspace.name}
                {workspaceId === workspace.id && (
                  <Check size={16} className="text-primary" />
                )}
              </Link>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link
            href={lobbyPath}
            className="flex cursor-pointer items-center text-muted-foreground"
          >
            <Plus size={16} className="mr-2" />
            Create Workspace
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
