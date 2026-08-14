"use client"
import React from "react"
import { useBoolean } from "usehooks-ts"
import {
  CreateWorkspaceFormTypes,
  getCreateWorkspaceSchema,
} from "./CreateWorkspaceSchema"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useTranslations } from "next-intl"
import CreateWorkspaceDialog from "./CreateWorkspaceDialog"
import { CreateWorkspaceForm } from "./CreateWorkspaceForm"
import { useCreateWorkspace } from "../../api/createWorkspace"

export default function CreateWorkspace() {
  const t = useTranslations("Workspaces")
  const createWorkspaceSchema = getCreateWorkspaceSchema(t)
  const createWorkspaceMutation = useCreateWorkspace({
    defaultMsg: t("createError"),
  })
  const { value: open, setValue: setOpen } = useBoolean(false)
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
