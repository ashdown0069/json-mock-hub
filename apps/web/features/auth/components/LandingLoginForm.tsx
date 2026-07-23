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

  const handleGoogleLogin = (e: React.MouseEvent) => {
    e.preventDefault()
    router.push("/workspaces")
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

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 font-bold text-muted-foreground">
                {t("orContinueWith")}
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            size="lg"
            onClick={handleGoogleLogin}
            disabled={isPending}
            className="h-12 w-full bg-background text-base font-bold enabled:cursor-pointer disabled:cursor-not-allowed disabled:pointer-events-auto"
          >
            <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {t("google")}
          </Button>

          {process.env.NODE_ENV === "development" && (
            <div className="space-y-2 pt-2 border-t border-dashed border-border">
              <p className="text-center text-xs font-semibold text-muted-foreground">
                🧪 개발 테스트용 Quick Login
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
          )}
        </div>

        <p className="text-center text-sm text-muted-foreground">
          {t("noAccount")}{" "}
          <a
            href="#"
            className="font-bold text-primary hover:underline"
            onClick={(e) => {
              e.preventDefault()
              router.push("/signup")
            }}
          >
            {t("signUpFree")}
          </a>
        </p>
      </div>
    </div>
  )
}
