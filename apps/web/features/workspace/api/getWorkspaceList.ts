import { axiosInstance, type customAxiosError } from "@/lib/axios"
import { useQuery } from "@tanstack/react-query"
import { workspaceKeys } from "@/lib/queryKeys"
import type { Workspace } from "../types"

/**
 * API 응답을 UI가 기대하는 형태로 정규화한다.
 * 서버 프리페치(getWorkspaceList.server.ts)와 클라이언트 쿼리가 같은 캐시 키를
 * 쓰므로, 양쪽이 반드시 이 함수를 통과해야 형태가 어긋나지 않는다.
 */
export function mapWorkspace(workspace: Workspace): Workspace {
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
