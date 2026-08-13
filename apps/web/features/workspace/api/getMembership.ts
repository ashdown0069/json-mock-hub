import { useQuery } from "@tanstack/react-query"
import { axiosInstance, type customAxiosError } from "@/lib/axios"
import { workspaceSettingsKeys } from "@/lib/queryKeys"

// 현재 로그인 사용자의 해당 워크스페이스 멤버십 상태.
// 서버 모듈(features/workspace/api/checkMembership.server.ts)은 401/403을 판별 유니온으로
// 감싸 따로 다루므로, 여기서는 정상 응답 형태만 표현한다.
export interface WorkspaceMembership {
  isMember: boolean
  role: "owner" | "member" | null
}

export async function getMembership(
  workspaceId: string
): Promise<WorkspaceMembership> {
  const { data } = await axiosInstance.get<WorkspaceMembership>(
    `/workspaces/${workspaceId}/membership`
  )
  return data
}

export function useMembership(workspaceId: string) {
  return useQuery<WorkspaceMembership, customAxiosError>({
    queryKey: workspaceSettingsKeys.membership(workspaceId),
    queryFn: () => getMembership(workspaceId),
    enabled: Boolean(workspaceId),
  })
}
