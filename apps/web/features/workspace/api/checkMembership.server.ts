import "server-only"
import { cookies } from "next/headers"

export type WorkspaceRole = "owner" | "member"

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
    const cookieStore = await cookies()
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL

    const res = await fetch(`${backendUrl}/workspaces/${workspaceId}/membership`, {
      method: "GET",
      headers: {
        Cookie: cookieStore.toString(),
        "X-Requested-With": "XMLHttpRequest",
      },
      cache: "no-store",
    })

    if (res.status === 401) {
      return { status: "unauthenticated" }
    }

    if (res.status === 403) {
      return { status: "ok", isMember: false, role: null }
    }

    if (!res.ok) {
      console.error("멤버십 확인 실패 (HTTP 오류):", res.status)
      return { status: "unavailable" }
    }

    const data = (await res.json()) as CheckMembershipResponse
    return { status: "ok", isMember: data.isMember, role: data.role }
  } catch (error) {
    console.error("멤버십 확인 실패:", error)
    return { status: "unavailable" }
  }
}
