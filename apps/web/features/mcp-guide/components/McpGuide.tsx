"use client"

import { InstallCard } from "./InstallCard"
import { UsageCard } from "./UsageCard"

interface McpGuideProps {
  workspaceId: string
}

/** MCP 연동 페이지 본문 — 설치와 사용법 카드를 위에서 아래로 배치한다. */
export function McpGuide({ workspaceId }: McpGuideProps) {
  return (
    <div className="grid max-w-4xl gap-6">
      <InstallCard workspaceId={workspaceId} />
      <UsageCard />
    </div>
  )
}
