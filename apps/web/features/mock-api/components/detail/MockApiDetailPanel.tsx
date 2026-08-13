"use client"

import { JsonPreviewPanel } from "./JsonPreviewPanel"
import { EndpointListPanel } from "./EndpointListPanel"

export function MockApiDetailPanel() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <JsonPreviewPanel />
      <EndpointListPanel />
    </div>
  )
}
