import { SidebarInset } from "@workspace/ui/components/sidebar"
import { WorkspaceSidebar } from "@/features/workspace/components/WorkspaceSidebar"
import { checkWorkspaceMembership } from "@/features/workspace/actions/workspace"
import { JoinWorkspaceGate } from "@/features/workspace/components/JoinWorkspaceGate"
import { redirect } from "next/navigation"
import { localePath } from "@/lib/localePath"

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string; workspaceId: string }>
}) {
  const { workspaceId, locale } = await params

  // 1. 서버사이드 멤버십 여부 판별
  const membership = await checkWorkspaceMembership(workspaceId)

  // 2. 인증 토큰이 유효하지 않은 경우 로그인 페이지 리다이렉트
  if (!membership) {
    redirect(localePath(locale, "/"))
  }

  // 3. 멤버가 아닌 경우 -> 비밀번호 입력 폼 렌더링
  if (!membership.isMember) {
    return <JoinWorkspaceGate workspaceId={workspaceId} />
  }

  // 4. 멤버인 경우 -> 기존 대시보드 렌더링 (owner 여부로 Settings 메뉴 노출 제어)
  return (
    <>
      <WorkspaceSidebar isOwner={membership.role === "owner"} />
      <SidebarInset className="flex h-screen flex-row overflow-hidden p-0">
        {children}
      </SidebarInset>
    </>
  )
}
