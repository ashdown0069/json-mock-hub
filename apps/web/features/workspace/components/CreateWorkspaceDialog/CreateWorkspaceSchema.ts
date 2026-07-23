"use client"
import { useTranslations } from "next-intl"
import { z } from "zod"

export function useCreateWorkspaceSchema() {
  const t = useTranslations("Workspaces")
  const createWorkspaceFormSchema = z
    .object({
      name: z.string().min(3, { message: t("error.name.min") }),
      description: z.string().optional(),
      password: z.string().optional(),
      passwordConfirm: z.string().optional(),
    })
    .refine(
      (data) => {
        // 둘 다 없으면 OK
        if (!data.password && !data.passwordConfirm) return true
        // 둘 다 존재해야 하고, 최소 길이 1 이상, 값이 같아야 함
        return (
          !!data.password &&
          !!data.passwordConfirm &&
          data.password.length >= 1 &&
          data.passwordConfirm.length >= 1 &&
          data.password === data.passwordConfirm
        )
      },
      {
        message: t("error.password.notMatch"),
        path: ["passwordConfirm"],
      }
    )

  return createWorkspaceFormSchema
}

export type CreateWorkspaceFormTypes = z.infer<
  ReturnType<typeof useCreateWorkspaceSchema>
>
