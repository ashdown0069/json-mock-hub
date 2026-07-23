import { getTranslations } from "next-intl/server"
import { McpGuide } from "@/features/mcp-guide/components/McpGuide"
import { getWorkspaceApiKeyServer } from "@/features/workspace-settings/api/apiKey.server"

export default async function McpPage({
  params,
}: {
  params: Promise<{ locale: string; workspaceId: string }>
}) {
  const { workspaceId } = await params
  const t = await getTranslations("WorkspaceMcp")
  // 멤버 권한 검증은 API(GET /workspaces/:id/api-key + WorkspaceMemberGuard)가 수행한다.
  // 키는 워크스페이스 생성 시 자동 발급되므로 항상 존재한다.
  const { apiKey } = await getWorkspaceApiKeyServer(workspaceId)

  return (
    <div className="h-full flex-1 overflow-y-auto bg-slate-50/50 p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">{t("pageTitle")}</h1>
      </div>

      <McpGuide workspaceId={workspaceId} apiKey={apiKey} />
    </div>
  )
}
