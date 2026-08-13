import { SidebarInset } from "@workspace/ui/components/sidebar"
import { WorkspaceSidebar } from "@/features/workspace/components/WorkspaceSidebar"
import { checkWorkspaceMembership } from "@/features/workspace/api/checkMembership.server"
import { JoinWorkspaceGate } from "@/features/workspace/components/JoinWorkspaceGate"
import { redirect } from "@/i18n/routing"

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

  // 2. 인증 실패(401)일 때만 로그인 페이지로 보낸다.
  if (membership.status === "unauthenticated") {
    redirect({ href: "/", locale })
    return null
  }

  // 3. 그 외 오류(5xx·네트워크)는 로그아웃이 아니다. 여기서 redirect하면
  //    API가 잠깐 죽었을 때 로그인한 사용자가 통째로 튕겨 나간다.
  //    다시 throw해 error 경계가 재시도 UI를 띄우게 한다.
  if (membership.status === "unavailable") {
    throw new Error("워크스페이스 정보를 불러오지 못했습니다.")
  }

  // 4. 멤버가 아닌 경우 -> 비밀번호 입력 폼 렌더링
  if (!membership.isMember) {
    return <JoinWorkspaceGate workspaceId={workspaceId} />
  }

  // 5. 멤버인 경우 -> 기존 대시보드 렌더링 (owner 여부로 Settings 메뉴 노출 제어)
  return (
    <>
      <WorkspaceSidebar isOwner={membership.role === "owner"} />
      <SidebarInset className="flex h-screen flex-row overflow-hidden p-0">
        {children}
      </SidebarInset>
    </>
  )
}

