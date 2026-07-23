import { useQuery } from "@tanstack/react-query"
import { axiosInstance, type customAxiosError } from "@/lib/axios"
import { workspaceSettingsKeys } from "@/lib/queryKeys"

interface MembershipResponse {
  isMember: boolean
  role: "owner" | "member" | null
}

interface RoleResponse {
  id: string
  workspace: string
  role: "owner" | "member"
  canCreate: boolean
  canRename: boolean
  canMove: boolean
  canDelete: boolean
  canUpdate: boolean
}

export interface MyPermissions {
  isLoading: boolean
  isOwner: boolean
  canCreate: boolean
  canRename: boolean
  canMove: boolean
  canDelete: boolean
  canUpdate: boolean
}

// 현재 사용자의 워크스페이스 권한을 조합해 반환하는 훅.
export function useMyPermissions(workspaceId: string): MyPermissions {
  const membershipQuery = useQuery<MembershipResponse, customAxiosError>({
    queryKey: workspaceSettingsKeys.membership(workspaceId),
    queryFn: async () => {
      const { data } = await axiosInstance.get<MembershipResponse>(
        `/workspaces/${workspaceId}/membership`
      )
      return data
    },
  })

  // settings의 roles 쿼리와 동일한 queryKey를 사용해 캐시를 공유한다
  const rolesQuery = useQuery<RoleResponse[], customAxiosError>({
    queryKey: workspaceSettingsKeys.roles(workspaceId),
    queryFn: async () => {
      const { data } = await axiosInstance.get<RoleResponse[]>(
        `/workspaces/${workspaceId}/roles`
      )
      return data
    },
  })

  const isLoading = membershipQuery.isLoading || rolesQuery.isLoading
  const isOwner = membershipQuery.data?.role === "owner"

  if (isOwner) {
    return {
      isLoading,
      isOwner: true,
      canCreate: true,
      canRename: true,
      canMove: true,
      canDelete: true,
      canUpdate: true,
    }
  }

  const memberRole = rolesQuery.data?.find((role) => role.role === "member")

  return {
    isLoading,
    isOwner: false,
    canCreate: memberRole?.canCreate ?? false,
    canRename: memberRole?.canRename ?? false,
    canMove: memberRole?.canMove ?? false,
    canDelete: memberRole?.canDelete ?? false,
    canUpdate: memberRole?.canUpdate ?? false,
  }
}
