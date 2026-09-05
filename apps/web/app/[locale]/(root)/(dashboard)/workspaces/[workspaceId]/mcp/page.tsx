import React from "react"
import { getTranslations } from "next-intl/server"
import { McpGuide } from "@/features/mcp-guide/components/McpGuide"

export default async function McpPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>
}) {
  const { workspaceId } = await params
  const t = await getTranslations("WorkspaceMcp")

  return (
    <div className="h-full flex-1 overflow-y-auto bg-slate-50/50 p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">{t("pageTitle")}</h1>
      </div>

      <McpGuide workspaceId={workspaceId} />
    </div>
  )
}
