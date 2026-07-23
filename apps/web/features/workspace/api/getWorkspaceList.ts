import { axiosInstance, type customAxiosError } from "@/lib/axios"
import { useQuery } from "@tanstack/react-query"
import { workspaceKeys } from "@/lib/queryKeys"

export interface Workspace {
  createdAt: string
  updatedAt: string
  name: string
  description: string
  membersCount: number
  id: string
}

function mapWorkspace(workspace: Workspace): Workspace {
  return {
    id: workspace.id,
    name: workspace.name,
    description: workspace.description,
    membersCount: workspace.membersCount ?? 0,
    createdAt: workspace.createdAt,
    updatedAt: workspace.updatedAt || workspace.createdAt,
  }
}

export async function getWorkspaceList(): Promise<Workspace[]> {
  const { data } = await axiosInstance.get<Workspace[]>("/workspaces")
  return data.map(mapWorkspace)
}

export function useGetWorkspaceList() {
  return useQuery<Workspace[], customAxiosError>({
    queryKey: workspaceKeys.lists(),
    queryFn: getWorkspaceList,
  })
}
