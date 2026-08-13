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
      {workspaces.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-16 text-center">
          <h3 className="text-base font-semibold text-slate-800">{t("emptyTitle")}</h3>
          <p className="mt-1 text-sm text-slate-400">{t("emptyDescription")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <WorkspacesGrid workspaces={workspaces} />
        </div>
      )}
    </div>
  )
}
