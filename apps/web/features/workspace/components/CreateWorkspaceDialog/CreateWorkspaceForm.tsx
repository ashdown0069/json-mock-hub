"use client"

import { UseFormReturn } from "react-hook-form"
import { DialogClose } from "@workspace/ui/components/dialog"
import { ConfirmButton, DestructiveButton } from "@/components/Button/Button"
import { FormInputField } from "@/components/Form/FormInputField"
import { useTranslations } from "next-intl"
import { CreateWorkspaceFormTypes } from "./CreateWorkspaceSchema"

interface CreateWorkspaceFormProps {
  form: UseFormReturn<CreateWorkspaceFormTypes>
  onSubmit: (values: CreateWorkspaceFormTypes) => Promise<void>
  isLoading: boolean
}

export function CreateWorkspaceForm({
  form,
  isLoading,
  onSubmit,
}: CreateWorkspaceFormProps) {
  const t = useTranslations("Workspaces")

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col space-y-8"
    >
      <FormInputField
        control={form.control}
        name="name"
        label={t("create.name")}
      />
      <FormInputField
        control={form.control}
        name="description"
        label={t("create.description")}
      />
      <FormInputField
        control={form.control}
        name="password"
        label={t("create.password")}
        type="password"
      />
      <FormInputField
        control={form.control}
        name="passwordConfirm"
        label={t("create.confirm")}
        type="password"
      />

      <div className="flex w-full gap-3">
        <DialogClose asChild>
          <DestructiveButton className="flex-1" TextType="cancel" />
        </DialogClose>
        <ConfirmButton
          className="flex-1"
          TextType="create"
          isLoading={isLoading}
          type="submit"
        />
      </div>
    </form>
  )
}
