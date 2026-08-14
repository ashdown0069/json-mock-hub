"use client"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import { Plus } from "lucide-react"
import { useTranslations } from "next-intl"

interface CreateWorkspaceDialogProps {
  children: React.ReactNode
  open: boolean
  setOpen: (open: boolean) => void
}

export default function CreateWorkspaceDialog({
  children,
  open,
  setOpen,
}: CreateWorkspaceDialogProps) {
  const t = useTranslations("Workspaces")

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="cursor-pointer p-5 dark:text-white">
          <Plus />
          <div className="hidden truncate text-base md:block">
            {t("createWorkspace")}
          </div>
          <div className="text-sm md:hidden">New</div>
        </Button>
      </DialogTrigger>
      <DialogContent className="duration-300 ease-out data-open:zoom-in-100 data-open:slide-in-from-top-16 data-closed:animate-none data-closed:duration-0">
        <DialogHeader>
          <DialogTitle className="text-center" title="create workspace">
            {t("createWorkspace")}
          </DialogTitle>
          <DialogDescription></DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}
