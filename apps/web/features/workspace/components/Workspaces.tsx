"use client"
import React from "react"
import { useGetWorkspaceList } from "../api/getWorkspaceList"
import { useTranslations } from "next-intl"
import WorkspacesGrid from "./WorkspacesGrid"
import CreateWorkspace from "./CreateWorkspaceDialog/CreateWorkspace"


export const Workspaces = () => {
  const { data: workspaces, isLoading, isError } = useGetWorkspaceList()
  const t = useTranslations("Workspaces")

  if (isLoading) {
    return (
      <div className="flex w-full items-center justify-center py-20 text-sm font-medium text-muted-foreground">
        {t("loading")}
      </div>
    )
  }

  if (isError || !workspaces) {
    return (
      <div className="flex w-full items-center justify-center py-20 text-sm font-semibold text-destructive">
        {t("loadError")}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div className="text-2xl font-semibold">{t("title")}</div>
        <CreateWorkspace />
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <WorkspacesGrid workspaces={workspaces} />
      </div>
    </div>
  )
}
