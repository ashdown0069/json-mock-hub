"use client"
import {
  Tooltip as TooltipWrapper,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import React from "react"

export const Tooltip = ({
  children,
  tooltipText,
}: {
  children: React.ReactNode
  tooltipText: string
}) => {
  return (
    <TooltipWrapper>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>
        <p>{tooltipText}</p>
      </TooltipContent>
    </TooltipWrapper>
  )
}
