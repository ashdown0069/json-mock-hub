"use client"

import React from "react"
import { useTranslations } from "next-intl"
import { Link, useRouter } from "@/i18n/routing"
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
import { useLogIn } from "../api/logInUserService"
import { getLoginSchema, type LoginSchema } from "../schema/loginSchema"

export function LandingLoginForm() {
  const t = useTranslations("LandingPage")
  const router = useRouter()
  const loginSchema = getLoginSchema(t)
  const { mutate: logIn, isPending } = useLogIn()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  const onSubmit = (data: LoginSchema) => {
    logIn(
      {
        email: data.email,
        password: data.password,
      },
      {
        onSuccess: () => {
          router.push("/workspaces")
        },
      }
    )
  }

  const handleTestLogin = (email: string, password: string) => {
    logIn(
      { email, password },
      {
        onSuccess: () => {
          router.push("/workspaces")
        },
      }
    )
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6 lg:p-12 xl:p-18">
      <div className="w-full max-w-md translate-x-0 space-y-8 opacity-100 transition-opacity duration-500">
        <div className="space-y-2 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight">
            {t("welcomeBack")}
          </h2>
          <p className="text-muted-foreground">{t("enterDetails")}</p>
        </div>

        <div className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <FieldGroup>
              <Field data-invalid={!!errors.email}>
                <FieldLabel htmlFor="email">{t("email")}</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder={t("emailPlaceholder")}
                  className="bg-background"
                  aria-invalid={!!errors.email}
                  {...register("email")}
                />
                <FieldError errors={[errors.email]} />
              </Field>
              <Field data-invalid={!!errors.password}>
                <FieldLabel htmlFor="password">{t("password")}</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  placeholder={t("passwordPlaceholder")}
                  className="bg-background"
                  aria-invalid={!!errors.password}
                  {...register("password")}
                />
                <FieldError errors={[errors.password]} />
              </Field>
            </FieldGroup>

            <Button
              type="submit"
              size="lg"
              className="h-12 w-full text-base font-bold enabled:cursor-pointer disabled:cursor-not-allowed disabled:pointer-events-auto"
              disabled={isPending}
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {t("signIn")}
                </span>
              ) : (
                t("signIn")
              )}
            </Button>
          </form>

          <div className="space-y-2 pt-2 border-t border-dashed border-border">
            <p className="text-center text-xs font-semibold text-muted-foreground">
              🧪 테스트용 Quick Login
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleTestLogin("test@test.com", "123123")}
                disabled={isPending}
                className="w-full text-xs font-medium cursor-pointer"
              >
                test@test.com
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleTestLogin("test2@test.com", "123123")}
                disabled={isPending}
                className="w-full text-xs font-medium cursor-pointer"
              >
                test2@test.com
              </Button>
            </div>
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          {t("noAccount")}{" "}
          <Link
            href="/signup"
            className="font-bold text-primary hover:underline"
          >
            {t("signUpFree")}
          </Link>
        </p>
      </div>
    </div>
  )
}
