import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { axiosInstance, type customAxiosError } from "@/lib/axios"
import { workspaceSettingsKeys } from "@/lib/queryKeys"

export interface WorkspaceRoleData {
  id: string
  workspace: string
  role: "owner" | "member"
  canCreate: boolean
  canRename: boolean
  canMove: boolean
  canDelete: boolean
  canUpdate: boolean
}

export interface RolePermissions {
  canCreate?: boolean
  canRename?: boolean
  canMove?: boolean
  canDelete?: boolean
  canUpdate?: boolean
}

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

export function useUpdateRole(workspaceId: string) {
  const queryClient = useQueryClient()

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
  })
}
