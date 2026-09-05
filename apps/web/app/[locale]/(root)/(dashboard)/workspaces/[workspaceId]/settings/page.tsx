import React from "react"
import { getTranslations } from "next-intl/server"
import { MembersSection } from "@/features/workspace-settings/components/MembersSection"
import { PermissionsSection } from "@/features/workspace-settings/components/PermissionsSection"
import { GeneralSettingsSection } from "@/features/workspace-settings/components/GeneralSettingsSection"

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>
}) {
  const { workspaceId } = await params
  const t = await getTranslations("WorkspaceSettings")

  return (
    <div className="h-full flex-1 overflow-y-auto bg-slate-50/50 p-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{t("pageTitle")}</h1>
      </div>

      <div className="grid max-w-4xl gap-6">
        <GeneralSettingsSection workspaceId={workspaceId} />
        <MembersSection workspaceId={workspaceId} />
        <PermissionsSection workspaceId={workspaceId} />
      </div>
    </div>
  )
}
