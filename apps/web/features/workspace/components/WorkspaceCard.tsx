"use client"

import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { ArrowRight, FolderOpen, User } from "lucide-react"
import React, { useState } from "react"
import type { WorkSpaceInfoProps } from "../types"
import { cn, formatDate } from "@/lib/utils"
import Link from "next/link"

export const WorkspaceCard = ({
  id,
  name,
  description,
  membersCount,
  createdAt,
  updatedAt,
}: WorkSpaceInfoProps) => {
  return (
    <Link href={`/workspaces/${id}`}>
      <Card
        className={cn(
          "group flex h-full w-full cursor-pointer flex-col shadow-sm transition-all hover:shadow-md"
        )}
      >
        <CardHeader className="pb-4">
          <div className="mb-2 flex items-start justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <FolderOpen className="h-5 w-5" />
            </div>
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" /> {membersCount}
            </div>
          </div>
          <CardTitle className="text-lg">{name}</CardTitle>
          <CardDescription className="line-clamp-2 min-h-10 text-xs">
            {description}
          </CardDescription>
        </CardHeader>
        <CardFooter className="mt-auto flex items-center justify-between border-t border-border/50 p-3 text-xs font-medium">
          <div>{formatDate(createdAt)}</div>
          <div
            className={cn(
              "flex items-center gap-1 font-bold text-primary opacity-0 transition-opacity group-hover:opacity-100"
            )}
          >
            Open <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </CardFooter>
      </Card>
    </Link>
  )
}
