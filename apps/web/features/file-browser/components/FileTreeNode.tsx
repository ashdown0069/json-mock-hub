"use client"

import * as React from "react"
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  FileBraces,
} from "lucide-react"
import { NodeRendererProps } from "react-arborist"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { FileTree } from "../types"
import { useFileBrowser } from "../store/useFileBrowser"
import { TreeActionButtons } from "./TreeActionButtons"
import { Input } from "@workspace/ui/components/input"
import { isValidItemName } from "@/lib/validateItemName"

export interface FileTreeNodeProps extends NodeRendererProps<FileTree> {
  onCancelCreate: () => void
  onEditMockApi?: (itemId: string) => void
}

export function FileTreeNode({
  node,
  style,
  dragHandle,
  onCancelCreate,
  onEditMockApi,
}: FileTreeNodeProps) {
  const t = useTranslations("errors")
  const setActiveItem = useFileBrowser((state) => state.setActiveItem)
  const isFolder = node.data.itemType === "Folder"
  const Icon = isFolder ? (node.isOpen ? FolderOpen : Folder) : FileBraces

  const submittedRef = React.useRef(false)

  React.useEffect(() => {
    if (!node.isEditing) {
      submittedRef.current = false
    }
  }, [node.isEditing])

  const handleEditSubmit = (val: string) => {
    if (submittedRef.current) return
    const trimmed = val.trim()
    if (!trimmed) {
      node.reset()
      if (node.id.startsWith("temp-")) onCancelCreate()
      return
    }
    if (!isValidItemName(trimmed)) {
      toast.error(t("itemNameRule"), { position: "top-center" })
      node.reset()
      if (node.id.startsWith("temp-")) onCancelCreate()
      return
    }
    submittedRef.current = true
    node.submit(trimmed)
  }

  return (
    <div
      style={style}
      ref={dragHandle}
      className={`group flex cursor-pointer items-center justify-between rounded-md px-2 py-1 text-sm transition-colors select-none hover:bg-primary/10 ${
        node.isSelected
          ? "bg-primary/20 font-medium text-slate-900"
          : "text-slate-600"
      }`}
      onClick={(e) => {
        if (node.isEditing) return
        node.handleClick(e)
        if (isFolder) {
          node.toggle()
        } else {
          setActiveItem(node.id)
        }
      }}
    >
      <div className="flex flex-1 items-center gap-1.5 overflow-hidden">
        {/* Folder Chevron toggle */}
        {isFolder ? (
          <span className="flex h-4 w-4 shrink-0 items-center justify-center text-slate-400">
            {node.isOpen ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            )}
          </span>
        ) : (
          <span className="h-4 w-4 shrink-0" />
        )}

        {/* Item Icon */}
        <Icon
          size={16}
          className={`shrink-0 ${
            isFolder ? "fill-amber-500/20 text-amber-500" : "text-slate-400"
          }`}
        />

        {/* Name & Inline Input */}
        {node.isEditing ? (
          <Input
            type="text"
            defaultValue={node.data.name}
            autoFocus
            onBlur={(e) => handleEditSubmit(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleEditSubmit(e.currentTarget.value)
              if (e.key === "Escape") {
                submittedRef.current = true // 후속 onBlur 방어
                node.reset()
                if (node.id.startsWith("temp-")) onCancelCreate()
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="h-6 max-w-[120px] px-1 py-0.5 text-xs"
          />
        ) : (
          <span className="truncate text-xs leading-none">
            {node.data.name}
          </span>
        )}
      </div>

      {/* Action Buttons */}
      {!node.isEditing && (
        <div className="pointer-events-none ml-2 flex shrink-0 items-center opacity-0 transition-opacity duration-200 group-hover:pointer-events-auto group-hover:opacity-100">
          <TreeActionButtons
            onCreateFolder={
              isFolder
                ? (e) => {
                    e.stopPropagation()
                    node.open()
                    node.tree.create({
                      parentId: node.id,
                      index: node.children?.length ?? 0,
                      type: "internal",
                    })
                  }
                : undefined
            }
            onCreateFile={
              isFolder
                ? (e) => {
                    e.stopPropagation()
                    node.open()
                    node.tree.create({
                      parentId: node.id,
                      index: node.children?.length ?? 0,
                      type: "leaf",
                    })
                  }
                : undefined
            }
            onRename={(e) => {
              e.stopPropagation()
              node.edit()
            }}
            onEdit={
              !isFolder
                ? (e) => {
                    e.stopPropagation()
                    onEditMockApi?.(node.id)
                  }
                : undefined
            }
            onDelete={(e) => {
              e.stopPropagation()
              node.tree.delete(node.id)
            }}
          />
        </div>
      )}
    </div>
  )
}
