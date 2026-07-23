import { getTranslations } from "next-intl/server"
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query"
import { MembersSection } from "@/features/workspace-settings/components/MembersSection"
import { PermissionsSection } from "@/features/workspace-settings/components/PermissionsSection"
import { ApiKeySection } from "@/features/workspace-settings/components/ApiKeySection"
import { GeneralSettingsSection } from "@/features/workspace-settings/components/GeneralSettingsSection"
import { prefetchMembers } from "@/features/workspace-settings/api/members.server"
import { prefetchRoles } from "@/features/workspace-settings/api/roles.server"
import { prefetchWorkspaceApiKey } from "@/features/workspace-settings/api/apiKey.server"
import { prefetchWorkspace } from "@/features/workspace/api/getWorkspace.server"

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>
}) {
  const { workspaceId } = await params
  const t = await getTranslations("WorkspaceSettings")

  const queryClient = new QueryClient()

  await Promise.all([
    prefetchWorkspace(queryClient, workspaceId),
    prefetchMembers(queryClient, workspaceId),
    prefetchRoles(queryClient, workspaceId),
    prefetchWorkspaceApiKey(queryClient, workspaceId),
  ])

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="h-full flex-1 overflow-y-auto bg-slate-50/50 p-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">{t("pageTitle")}</h1>
        </div>

        <div className="grid max-w-4xl gap-6">
          {/* 워크스페이스 이름 조회·저장 (기능 동작) */}
          <GeneralSettingsSection workspaceId={workspaceId} />

          {/* 멤버 목록·추방 (owner 전용) */}
          <MembersSection workspaceId={workspaceId} />

          {/* member 역할 공통 권한 체크박스 */}
          <PermissionsSection workspaceId={workspaceId} />

          {/* MCP 등 외부 클라이언트용 API 키 */}
          <ApiKeySection workspaceId={workspaceId} />
        </div>
      </div>
    </HydrationBoundary>
  )
}
