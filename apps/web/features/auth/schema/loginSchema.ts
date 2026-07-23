import { z } from "zod"

/**
 * 로그인 Zod 스키마 생성 함수.
 * next-intl의 useTranslations('LandingPage') 번역 함수를 받아
 * 다국어 에러 메시지가 적용된 스키마를 반환합니다. (signupSchema와 동일 패턴)
 */
export const getLoginSchema = (t: (key: string) => string) =>
  z.object({
    email: z.string().email({ message: t("invalidEmail") }),
    password: z.string().min(1, { message: t("passwordRequired") }),
  })

export type LoginSchema = z.infer<ReturnType<typeof getLoginSchema>>
