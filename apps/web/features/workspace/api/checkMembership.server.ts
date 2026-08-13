import "server-only"
import axios from "axios"
import { serverAxiosInstance } from "@/lib/serverAxios"

export type WorkspaceRole = "owner" | "member"

/**
 * 멤버십 조회 결과.
 *
 * 이전에는 401/403/500/타임아웃을 전부 null로 뭉개서, layout이 이를 "인증 실패"로
 * 해석해 로그인 페이지로 보냈다. API 재시작만으로 사용자가 로그아웃되던 원인이다.
 */
export type MembershipResult =
  | { status: "ok"; isMember: boolean; role: WorkspaceRole | null }
  | { status: "unauthenticated" }
  | { status: "unavailable" }

interface CheckMembershipResponse {
  isMember: boolean
  role: WorkspaceRole | null
}

export async function checkWorkspaceMembership(
  workspaceId: string
): Promise<MembershipResult> {
  try {
    const { data } = await serverAxiosInstance.get<CheckMembershipResponse>(
      `/workspaces/${workspaceId}/membership`
    )
    return { status: "ok", isMember: data.isMember, role: data.role }
  } catch (error) {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined

    // 401: 토큰이 없거나 갱신 실패 — 로그인이 필요하다
    if (status === 401) {
      return { status: "unauthenticated" }
    }

    // 403: 인증은 됐으나 멤버가 아니다 — 참여 폼을 보여줘야 한다
    if (status === 403) {
      return { status: "ok", isMember: false, role: null }
    }

    console.error("멤버십 확인 실패:", error)
    return { status: "unavailable" }
  }
}
