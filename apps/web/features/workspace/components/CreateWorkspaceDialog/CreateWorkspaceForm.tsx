"use client"

import React from "react"
import { UseFormReturn } from "react-hook-form"
import { DialogClose } from "@workspace/ui/components/dialog"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Field,
  FieldLabel,
  FieldError,
  FieldGroup,
} from "@workspace/ui/components/field"
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
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col space-y-6">
      <FieldGroup>
        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor="ws-create-name">{t("create.name")}</FieldLabel>
          <Input
            id="ws-create-name"
            placeholder={t("create.name")}
            aria-invalid={!!errors.name}
            {...register("name")}
          />
          <FieldError errors={[errors.name]} />
        </Field>

        <Field data-invalid={!!errors.description}>
          <FieldLabel htmlFor="ws-create-description">{t("create.description")}</FieldLabel>
          <Input
            id="ws-create-description"
            placeholder={t("create.description")}
            aria-invalid={!!errors.description}
            {...register("description")}
          />
          <FieldError errors={[errors.description]} />
        </Field>

        <Field data-invalid={!!errors.password}>
          <FieldLabel htmlFor="ws-create-password">{t("create.password")}</FieldLabel>
          <Input
            id="ws-create-password"
            type="password"
            placeholder={t("create.password")}
            aria-invalid={!!errors.password}
            {...register("password")}
          />
          <FieldError errors={[errors.password]} />
        </Field>

        <Field data-invalid={!!errors.passwordConfirm}>
          <FieldLabel htmlFor="ws-create-confirm">{t("create.confirm")}</FieldLabel>
          <Input
            id="ws-create-confirm"
            type="password"
            placeholder={t("create.confirm")}
            aria-invalid={!!errors.passwordConfirm}
            {...register("passwordConfirm")}
          />
          <FieldError errors={[errors.passwordConfirm]} />
        </Field>
      </FieldGroup>

      <div className="flex w-full gap-3 pt-2">
        <DialogClose asChild>
          <Button type="button" variant="outline" className="flex-1 cursor-pointer">
            {t("cancel")}
          </Button>
        </DialogClose>
        <Button
          type="submit"
          disabled={isLoading}
          className="flex-1 cursor-pointer"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              {t("loading")}
            </span>
          ) : (
            t("createWorkspace")
          )}
        </Button>
      </div>
    </form>
  )
}

