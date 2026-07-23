import { z } from "zod"

/**
 * 회원가입 Zod 스키마 생성 함수
 * next-intl의 useTranslations('SignupPage') 번역 함수를 받아
 * 다국어 에러 메시지가 적용된 스키마를 반환합니다.
 */
export const getSignupSchema = (t: (key: string) => string) =>
  z
    .object({
      email: z.string().email({ message: t("error.invalidEmail") }),
      nickname: z
        .string()
        .min(1, { message: t("error.nicknameRequired") })
        .min(2, { message: t("error.nicknameMin") }),
      password: z.string().min(6, { message: t("error.passwordMin") }),
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("error.passwordNotMatch"),
      path: ["confirmPassword"],
    })

export type SignupFormValues = z.infer<ReturnType<typeof getSignupSchema>>
