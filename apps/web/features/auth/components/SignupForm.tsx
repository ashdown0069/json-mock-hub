"use client"

import React from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  FieldGroup,
  Field,
  FieldLabel,
  FieldError,
} from "@workspace/ui/components/field"
import { getSignupSchema, type SignupFormValues } from "../schema/signupSchema"
import { useSignup } from "../api/signupService"
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler"

export function SignupForm() {
  const t = useTranslations("SignupPage")
  const handleError = useApiErrorHandler()
  const router = useRouter()
  const signupSchema = getSignupSchema(t)
  const { mutate: signup, isPending } = useSignup()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      nickname: "",
      password: "",
      confirmPassword: "",
    },
  })

  const onSubmit = (data: SignupFormValues) => {
    signup(
      {
        email: data.email,
        nickname: data.nickname,
        password: data.password,
      },
      {
        onSuccess: () => {
          router.push("/")
        },
        onError: (error) => {
          handleError(error, { defaultMsg: "회원가입에 실패했습니다." })
        }
      }
    )
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12 xl:p-18">
      <div className="w-full max-w-md space-y-8">
        {/* 헤더 */}
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-extrabold tracking-tight">
            {t("title")}
          </h2>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>

        {/* 카드 폼 영역 */}
        <div className="bg-card border border-border p-6 sm:p-8 rounded-2xl shadow-sm space-y-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <FieldGroup>
              {/* 이메일 */}
              <Field data-invalid={!!errors.email} className="min-h-[76px]">
                <FieldLabel htmlFor="signup-email">{t("email")}</FieldLabel>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder={t("emailPlaceholder")}
                  className="bg-background"
                  aria-invalid={!!errors.email}
                  {...register("email")}
                />
                <FieldError errors={[errors.email]} />
              </Field>

              {/* 닉네임 */}
              <Field data-invalid={!!errors.nickname} className="min-h-[76px]">
                <FieldLabel htmlFor="signup-nickname">
                  {t("nickname")}
                </FieldLabel>
                <Input
                  id="signup-nickname"
                  type="text"
                  placeholder={t("nicknamePlaceholder")}
                  className="bg-background"
                  aria-invalid={!!errors.nickname}
                  {...register("nickname")}
                />
                <FieldError errors={[errors.nickname]} />
              </Field>

              {/* 비밀번호 */}
              <Field data-invalid={!!errors.password} className="min-h-[76px]">
                <FieldLabel htmlFor="signup-password">
                  {t("password")}
                </FieldLabel>
                <Input
                  id="signup-password"
                  type="password"
                  placeholder={t("passwordPlaceholder")}
                  className="bg-background"
                  aria-invalid={!!errors.password}
                  {...register("password")}
                />
                <FieldError errors={[errors.password]} />
              </Field>

              {/* 비밀번호 확인 */}
              <Field
                data-invalid={!!errors.confirmPassword}
                className="min-h-[76px]"
              >
                <FieldLabel htmlFor="signup-confirm-password">
                  {t("confirmPassword")}
                </FieldLabel>
                <Input
                  id="signup-confirm-password"
                  type="password"
                  placeholder={t("confirmPasswordPlaceholder")}
                  className="bg-background"
                  aria-invalid={!!errors.confirmPassword}
                  {...register("confirmPassword")}
                />
                <FieldError errors={[errors.confirmPassword]} />
              </Field>
            </FieldGroup>

            <Button
              type="submit"
              size="lg"
              className="w-full h-12 text-base font-bold cursor-pointer"
              disabled={isPending}
            >
              {isPending ? "..." : t("submit")}
            </Button>
          </form>
        </div>

        {/* 하단 로그인 링크 */}
        <p className="text-center text-sm text-muted-foreground">
          {t("hasAccount")}{" "}
          <a
            href="/"
            className="text-primary font-bold hover:underline"
            onClick={(e) => {
              e.preventDefault()
              router.push("/")
            }}
          >
            {t("signIn")}
          </a>
        </p>
      </div>
    </div>
  )
}
