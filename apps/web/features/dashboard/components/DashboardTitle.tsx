"use client"

import React from "react"
import { useTranslations } from "next-intl"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { useGetWorkspace } from "@/features/workspace/api/getWorkspace"

interface DashboardTitleProps {
  workspaceId: string
}

export function DashboardTitle({ workspaceId }: DashboardTitleProps) {
  const t = useTranslations("WorkspacePages")
  const { data: workspace, isLoading } = useGetWorkspace(workspaceId)

  if (isLoading) {
    return <Skeleton data-testid="dashboard-title-skeleton" className="h-8 w-48 rounded-lg" />
  }

  const titleText = workspace?.name
    ? t("dashboardTitleWithName", { name: workspace.name })
    : t("dashboardTitle")

  return <h1 className="text-2xl font-bold tracking-tight">{titleText}</h1>
}
