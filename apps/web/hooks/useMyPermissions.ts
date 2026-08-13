import { useMembership } from "@/features/workspace/api/getMembership"
import { useRoles } from "@/features/workspace-settings/api/roles"
import type { TreePermissions } from "@/types/permissions"

export interface MyPermissions extends TreePermissions {
  isLoading: boolean
  /** 권한 조회 자체가 실패한 상태. false 권한과 구분해 UI가 "숨김" 대신 안내를 띄울 수 있게 한다 */
  isError: boolean
  isOwner: boolean
}

// 현재 사용자의 워크스페이스 권한을 조합해 반환하는 훅.
// 통신은 각 feature의 api 파일에 위임하고 여기서는 조합만 담당한다.
export function useMyPermissions(workspaceId: string): MyPermissions {
  const membershipQuery = useMembership(workspaceId)
  // settings의 roles 쿼리와 동일한 queryKey를 쓰므로 캐시가 공유된다
  const rolesQuery = useRoles(workspaceId)

  const isLoading = membershipQuery.isLoading || rolesQuery.isLoading
  const isError = membershipQuery.isError || rolesQuery.isError
  const isOwner = membershipQuery.data?.role === "owner"

  if (isOwner) {
    return {
      isLoading,
      isError,
      isOwner: true,
      canCreate: true,
      canRename: true,
      canMove: true,
      canDelete: true,
      canUpdate: true,
    }
  }

  const memberRole = rolesQuery.data?.find((role) => role.role === "member")

  // 장애 시에도 플래그는 false로 둔다(안전한 기본값). 대신 isError로 원인을 구분할 수 있게 한다.
  return {
    isLoading,
    isError,
    isOwner: false,
    canCreate: memberRole?.canCreate ?? false,
    canRename: memberRole?.canRename ?? false,
    canMove: memberRole?.canMove ?? false,
    canDelete: memberRole?.canDelete ?? false,
    canUpdate: memberRole?.canUpdate ?? false,
  }
}
