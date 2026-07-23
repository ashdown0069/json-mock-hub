import React from "react"

export interface WorkSpaceInfoProps {
  id: string
  name: string
  description: string
  membersCount: number
  createdAt: string
  updatedAt: string
}

export interface WorkSpaceCardContextMenuProps {
  children: React.ReactNode
  setIsFocused: React.Dispatch<React.SetStateAction<boolean>>
  id: string
}
