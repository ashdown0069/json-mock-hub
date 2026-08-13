"use client"

import { useParams } from "next/navigation"

/**
 * 워크스페이스 기준 경로를 "로케일 접두사가 없는 논리 경로"로 제공한다.
 * 접두사 부착은 @/i18n/routing의 Link/useRouter/redirect가 전담하므로
 * 여기서 직접 붙이면 /ko/ko/... 처럼 이중으로 부착된다.
 */
export function useWorkspaceBasePath() {
  const params = useParams()
  const workspaceId = params.workspaceId as string

  return {
    basePath: `/workspaces/${workspaceId}`,
    lobbyPath: "/workspaces",
    workspaceId,
  }
}
