"use server"

import { serverAxiosInstance } from "@/lib/serverAxios"

export type WorkspaceRole = "owner" | "member"

interface CheckMembershipResult {
  isMember: boolean
  role: WorkspaceRole | null
}

export async function checkWorkspaceMembership(
  workspaceId: string
): Promise<CheckMembershipResult | null> {
  try {
    const { data } = await serverAxiosInstance.get<CheckMembershipResult>(
      `/workspaces/${workspaceId}/membership`
    )
    return data
  } catch (error) {
    console.error("멤버십 확인 실패:", error)
    return null
  }
}
