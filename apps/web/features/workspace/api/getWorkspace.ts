import { useQuery } from "@tanstack/react-query"
import { axiosInstance, type customAxiosError } from "@/lib/axios"
import { workspaceKeys } from "@/lib/queryKeys"
import { mapWorkspace } from "./getWorkspaceList"
import type { Workspace } from "../types"

export async function getWorkspace(workspaceId: string): Promise<Workspace> {
  const { data } = await axiosInstance.get<Workspace>(`/workspaces/${workspaceId}`)
  return mapWorkspace(data)
}

export function useGetWorkspace(workspaceId: string) {
  return useQuery<Workspace, customAxiosError>({
    queryKey: workspaceKeys.detail(workspaceId),
    queryFn: () => getWorkspace(workspaceId),
    enabled: !!workspaceId,
  })
}
