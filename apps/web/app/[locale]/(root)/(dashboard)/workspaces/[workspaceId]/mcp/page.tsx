import { getTranslations } from "next-intl/server"
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query"
import { McpGuide } from "@/features/mcp-guide/components/McpGuide"
import { prefetchWorkspaceApiKey } from "@/features/mcp-guide/api/apiKey.server"

export default async function McpPage({
  params,
}: {
  params: Promise<{ locale: string; workspaceId: string }>
}) {
  const { workspaceId } = await params
  const t = await getTranslations("WorkspaceMcp")

  // 키는 멤버 누구나 자기 것을 조회할 수 있다(WorkspaceMemberGuard).
  // 비멤버 접근이나 API 장애로 prefetch가 실패해도 페이지가 죽지 않도록
  // 클라이언트 쿼리가 다시 시도하게 두고, 여기서는 오류를 흡수만 한다.
  const queryClient = new QueryClient()
  try {
    await prefetchWorkspaceApiKey(queryClient, workspaceId)
  } catch (error) {
    console.error("[mcp page] API 키 prefetch 실패:", error)
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="h-full flex-1 overflow-y-auto bg-slate-50/50 p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">{t("pageTitle")}</h1>
        </div>

        <McpGuide workspaceId={workspaceId} />
      </div>
    </HydrationBoundary>
  )
}
