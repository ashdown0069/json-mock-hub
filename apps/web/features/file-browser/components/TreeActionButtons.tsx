"use client"

import { FolderPlus, Plus, Pencil, Trash2, FilePen } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Tooltip } from "@/components/Tooltip/Tooltip";

interface Props {
  onCreateFolder?: (e: React.MouseEvent) => void;
  onCreateFile?: (e: React.MouseEvent) => void;
  onRename?: (e: React.MouseEvent) => void;
  onEdit?: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
  canCreate?: boolean;
  canRename?: boolean;
  canDelete?: boolean;
  canUpdate?: boolean;
}

export function TreeActionButtons({
  onCreateFolder,
  onCreateFile,
  onRename,
  onEdit,
  onDelete,
  canCreate = true,
  canRename = true,
  canDelete = true,
  canUpdate = true,
}: Props) {

  return (
    <div className="flex items-center gap-1 bg-transparent">
      {onCreateFolder && (
        <Tooltip
          tooltipText={canCreate ? "Create Folder" : "No permission"}
        >
          <span className="inline-block">
            <Button
              variant="ghost"
              size="icon-sm"
              className="size-6 p-1 cursor-pointer hover:bg-neutral-200 disabled:pointer-events-none"
              onClick={onCreateFolder}
              disabled={!canCreate}
              aria-label={canCreate ? "Create Folder" : "No permission"}
            >
              <FolderPlus size={12} className="cursor-pointer" />
            </Button>
          </span>
        </Tooltip>
      )}
      {onCreateFile && (
        <Tooltip
          tooltipText={canCreate ? "Create Mock API" : "No permission"}
        >
          <span className="inline-block">
            <Button
              variant="ghost"
              size="icon-sm"
              className="size-6 p-1 cursor-pointer hover:bg-neutral-200 disabled:pointer-events-none"
              onClick={onCreateFile}
              disabled={!canCreate}
              aria-label={canCreate ? "Create Mock API" : "No permission"}
            >
              <Plus size={12} className="cursor-pointer" />
            </Button>
          </span>
        </Tooltip>
      )}
      {onRename && (
        <Tooltip tooltipText={canRename ? "Rename" : "No permission"}>
          <span className="inline-block">
            <Button
              variant="ghost"
              size="icon-sm"
              className="size-6 p-1 cursor-pointer hover:bg-neutral-200 disabled:pointer-events-none"
              onClick={onRename}
              disabled={!canRename}
              aria-label={canRename ? "Rename" : "No permission"}
            >
              <Pencil size={12} className="cursor-pointer" />
            </Button>
          </span>
        </Tooltip>
      )}
      {onEdit && (
        <Tooltip tooltipText={canUpdate ? "Edit Mock API" : "No permission"}>
          <span className="inline-block">
            <Button
              variant="ghost"
              size="icon-sm"
              className="size-6 p-1 cursor-pointer hover:bg-neutral-200 disabled:pointer-events-none"
              onClick={onEdit}
              disabled={!canUpdate}
              aria-label={canUpdate ? "Edit Mock API" : "No permission"}
            >
              <FilePen size={12} className="cursor-pointer" />
            </Button>
          </span>
        </Tooltip>
      )}
      {onDelete && (
        <Tooltip tooltipText={canDelete ? "Delete" : "No permission"}>
          <span className="inline-block">
            <Button
              variant="ghost"
              size="icon-sm"
              className="size-6 p-1 cursor-pointer hover:bg-red-100 text-red-500 hover:text-red-600 disabled:pointer-events-none"
              onClick={onDelete}
              disabled={!canDelete}
              aria-label={canDelete ? "Delete" : "No permission"}
            >
              <Trash2 size={12} className="cursor-pointer" />
            </Button>
          </span>
        </Tooltip>
      )}
    </div>
  );
}
