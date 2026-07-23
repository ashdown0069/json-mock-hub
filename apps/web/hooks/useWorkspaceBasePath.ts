"use client"

import { useParams } from "next/navigation"
import { localePath } from "@/lib/localePath"

/**
 * locale이 ko(기본 로케일)일 때 URL에서 locale 세그먼트를 생략하는
 * 워크스페이스 경로 규칙을 공용화한 훅입니다. (WorkspaceSidebar와 동일 규칙)
 */
export function useWorkspaceBasePath() {
  const params = useParams()
  const locale = params.locale as string
  const workspaceId = params.workspaceId as string

  const basePath = localePath(locale, `/workspaces/${workspaceId}`)
  const lobbyPath = localePath(locale, "/workspaces")

  return { basePath, lobbyPath, workspaceId, locale }
}
