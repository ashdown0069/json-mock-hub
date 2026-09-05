"use client"

import React from "react"
import { useGetWorkspaceList } from "../api/getWorkspaceList"
import { useTranslations } from "next-intl"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { WorkspaceCard } from "./WorkspaceCard"
import CreateWorkspace from "./CreateWorkspaceDialog/CreateWorkspace"

export const Workspaces = () => {
  const { data: workspaces, isLoading, isError } = useGetWorkspaceList()
  const t = useTranslations("Workspaces")

  // 세부 요소가 아닌 큼직한 2개 섹션(헤더 바 + 카드 그리드 블록)으로 로딩 처리
  if (isLoading) {
    return (
      <div data-testid="workspaces-skeleton" className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-36 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-44 w-full rounded-xl" />
          <Skeleton className="h-44 w-full rounded-xl" />
          <Skeleton className="h-44 w-full rounded-xl" />
        </div>
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
          {workspaces.map((workspace) => (
            <WorkspaceCard key={workspace.id} {...workspace} />
          ))}
        </div>
      )}
    </div>
  )
}
