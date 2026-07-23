"use client"

import { FileItem } from "@/features/file-browser/types"
import { JsonPreviewPanel } from "./JsonPreviewPanel"
import { EndpointListPanel } from "./EndpointListPanel"

interface MockApiDetailPanelProps {
  item: FileItem
  workspaceId: string
}

/**
 * Mock API 상세 내역을 나타내는 좌우 분할 패널 컨테이너입니다.
 * 요구사항 1과 2를 바탕으로 좌측에는 JSON 응답 데이터, 우측에는 엔드포인트 CRUD 명세 목록을 분할해서 렌더링합니다.
 */
export function MockApiDetailPanel({ item, workspaceId }: MockApiDetailPanelProps) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* 좌측: JSON 및 페이지네이션 정보 */}
      <JsonPreviewPanel item={item} />
      {/* 우측: CRUD API 엔드포인트 리스트 */}
      <EndpointListPanel item={item} workspaceId={workspaceId} />
    </div>
  )
}
