import { checkWorkspaceMembership } from "@/features/workspace/actions/workspace"
import { redirect } from "next/navigation"
import { localePath } from "@/lib/localePath"

// settings 하위 전체를 owner 전용으로 차단하는 서버사이드 가드.
// 사이드바에서 아이콘을 숨겨도 URL 직접 입력으로 접근할 수 있으므로
// 라우트 레벨에서 role을 재검증한다 (최종 방어선은 API의 WorkspaceOwnerGuard).
export default async function SettingsLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string; workspaceId: string }>
}) {
  const { locale, workspaceId } = await params

  const membership = await checkWorkspaceMembership(workspaceId)

  if (!membership || membership.role !== "owner") {
    // 상위 layout의 리다이렉트 관례를 따름
    redirect(localePath(locale, `/workspaces/${workspaceId}`))
  }

  return <>{children}</>
}
