import { z } from "zod"

export function getCreateWorkspaceSchema(t: (key: string) => string) {
  return z
    .object({
      name: z.string().min(3, { message: t("error.name.min") }),
      description: z.string().optional(),
      // 워크스페이스 참여는 비밀번호 대조로만 이뤄지므로(joinWorkspace) 필수다.
      // 이전에는 optional이라 빈 값으로 제출하면 API가 500을 반환했다.
      password: z.string().min(4, { message: t("error.password.min") }),
      passwordConfirm: z
        .string({ required_error: t("error.password.notMatch") })
        .min(1, { message: t("error.password.min") }),
    })
    .refine((data) => data.password === data.passwordConfirm, {
      message: t("error.password.notMatch"),
      path: ["passwordConfirm"],
    })
}

export type CreateWorkspaceFormTypes = z.infer<
  ReturnType<typeof getCreateWorkspaceSchema>
>

