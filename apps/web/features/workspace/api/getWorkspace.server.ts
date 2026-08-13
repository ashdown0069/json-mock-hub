import "server-only"
import { QueryClient } from "@tanstack/react-query"
import { serverAxiosInstance } from "@/lib/serverAxios"
import { workspaceKeys } from "@/lib/queryKeys"
import { mapWorkspace } from "./getWorkspaceList"
import type { Workspace } from "../types"

/**
 * 서버 프리페치와 클라이언트 쿼리가 같은 캐시 키를 쓰면 정규화도 공유해야 한다.
 * mapWorkspace를 건너뛰면 서버가 채운 캐시와 클라이언트가 만드는 값의 형태가
 * 달라져 hydration 불일치가 된다(getWorkspaceList.server.ts:5,11과 같은 규칙).
 */
export async function getWorkspaceServer(
  workspaceId: string
): Promise<Workspace> {
  const { data } = await serverAxiosInstance.get<Workspace>(
    `/workspaces/${workspaceId}`
  )
  return mapWorkspace(data)
}

/**
 * 캐시를 채우면서 값도 돌려준다.
 *
 * 이전에는 페이지가 getWorkspaceServer(제목 표시용)와 prefetchWorkspace(하이드레이션용)를
 * 같은 Promise.all에 넣어 **같은 엔드포인트를 요청당 2회** 호출했다.
 * fetchQuery는 결과를 캐시에 넣고 값도 반환하므로 한 번으로 끝난다.
 */
export async function fetchWorkspace(
  queryClient: QueryClient,
  workspaceId: string
): Promise<Workspace> {
  return queryClient.fetchQuery({
    queryKey: workspaceKeys.detail(workspaceId),
    queryFn: () => getWorkspaceServer(workspaceId),
  })
}
