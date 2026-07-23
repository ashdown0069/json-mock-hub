"use client"
import React, { useState } from "react"
import {
  CreateWorkspaceFormTypes,
  useCreateWorkspaceSchema,
} from "./CreateWorkspaceSchema"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler"
import { useTranslations } from "next-intl"
import CreateWorkspaceDialog from "./CreateWorkspaceDialog"
import { CreateWorkspaceForm } from "./CreateWorkspaceForm"
import { useCreateWorkspace } from "../../api/createWorkspace"

export default function CreateWorkspace() {
  const handleError = useApiErrorHandler()
  const t = useTranslations("Workspaces")
  const createWorkspaceSchema = useCreateWorkspaceSchema()
  const createWorkspaceMutation = useCreateWorkspace()
  const [open, setOpen] = useState(false)
  const form = useForm<CreateWorkspaceFormTypes>({
    resolver: zodResolver(createWorkspaceSchema),
    defaultValues: {
      name: "",
      description: "",
      password: "",
      passwordConfirm: "",
    },
  })

  const handleOpenChange = (open: boolean) => {
    setOpen(open)
    if (!open) {
      form.reset()
    }
  }

  const createNewWorkspaceSubmit = async (values: CreateWorkspaceFormTypes) => {
    createWorkspaceMutation.mutate(
      {
        name: values.name,
        description: values.description ?? "",
        password: values.password,
        passwordConfirm: values.passwordConfirm,
      },
      {
        onSuccess: () => {
          handleOpenChange(false)
        },
        onError: (error) => {
          handleError(error, { defaultMsg: t("createError") })
        },
      }
    )
  }
  return (
    <CreateWorkspaceDialog open={open} setOpen={handleOpenChange}>
      <CreateWorkspaceForm
        form={form}
        isLoading={createWorkspaceMutation.isPending}
        onSubmit={createNewWorkspaceSubmit}
      />
    </CreateWorkspaceDialog>
  )
}
