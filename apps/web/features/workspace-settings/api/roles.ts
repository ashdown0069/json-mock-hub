import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { axiosInstance, type customAxiosError } from "@/lib/axios"
import { workspaceSettingsKeys } from "@/lib/queryKeys"
import type { TreePermissions } from "@/types/permissions"

export interface WorkspaceRoleData extends TreePermissions {
  id: string
  workspace: string
  role: "owner" | "member"
}

/** PATCH /roles/:roleId 부분 수정 바디. 전 필드 옵셔널 = TreePermissions의 Partial. */
export type RolePermissions = Partial<TreePermissions>

export async function getRoles(workspaceId: string): Promise<WorkspaceRoleData[]> {
  const { data } = await axiosInstance.get<WorkspaceRoleData[]>(
    `/workspaces/${workspaceId}/roles`
  )
  return data
}

export function useRoles(workspaceId: string) {
  return useQuery<WorkspaceRoleData[], customAxiosError>({
    queryKey: workspaceSettingsKeys.roles(workspaceId),
    queryFn: () => getRoles(workspaceId),
    // useMyPermissions가 workspaceId 없이 렌더될 수 있으므로 빈 값에서는 요청하지 않는다
    enabled: Boolean(workspaceId),
  })
}

export async function updateRole(
  workspaceId: string,
  roleId: string,
  permissions: RolePermissions
): Promise<WorkspaceRoleData> {
  const { data } = await axiosInstance.patch<WorkspaceRoleData>(
    `/workspaces/${workspaceId}/roles/${roleId}`,
    permissions
  )
  return data
}

import { useApiErrorHandler } from "@/hooks/useApiErrorHandler"

export function useUpdateRole(workspaceId: string) {
  const queryClient = useQueryClient()
  const handleApiError = useApiErrorHandler()

  return useMutation<
    WorkspaceRoleData,
    customAxiosError,
    { roleId: string; permissions: RolePermissions }
  >({
    mutationFn: ({ roleId, permissions }) =>
      updateRole(workspaceId, roleId, permissions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceSettingsKeys.roles(workspaceId) })
    },
    onError: (error) => handleApiError(error),
  })
}
