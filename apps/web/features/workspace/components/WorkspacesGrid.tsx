import React from "react"
import { WorkspaceCard } from "./WorkspaceCard"
import type { Workspace } from "../types"

export default function WorkspacesGrid({ workspaces }: { workspaces: Workspace[] }) {
  return (
    <>
      {workspaces.map((workspace) => (
        <WorkspaceCard key={workspace.id} {...workspace} />
      ))}
    </>
  )
}
