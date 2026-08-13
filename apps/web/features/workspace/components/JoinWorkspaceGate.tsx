"use client"

import { useBoolean } from "usehooks-ts"
import { useForm, Controller } from "react-hook-form"
import { useRouter } from "@/i18n/routing"
import { Eye, EyeOff, Lock, LogIn } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import { Field, FieldLabel, FieldError } from "@workspace/ui/components/field"
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
  InputGroupButton,
} from "@workspace/ui/components/input-group"
import { toast } from "sonner"
import { useTranslations } from "next-intl"
import { useJoinWorkspace } from "../api/joinWorkspace"
import type { customAxiosError } from "@/lib/axios"
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler"

interface JoinWorkspaceGateProps {
  workspaceId: string
}

interface JoinFormValues {
  password: string
}

export function JoinWorkspaceGate({ workspaceId }: JoinWorkspaceGateProps) {
  const router = useRouter()
  const handleError = useApiErrorHandler()
  const t = useTranslations("JoinWorkspace")
  const { value: showPassword, toggle: toggleShowPassword } = useBoolean(false)
  const { control, handleSubmit, setError, setValue } = useForm<JoinFormValues>(
    {
      defaultValues: { password: "" },
    }
  )

  const { mutate: joinWorkspace, isPending } = useJoinWorkspace(workspaceId)

  const onSubmit = (values: JoinFormValues) => {
    joinWorkspace(
      { password: values.password },
      {
        onSuccess: () => {
          toast.success(t("joinSuccess"), {
            position: "top-center",
          })
          router.refresh()
        },
        onError: (error: customAxiosError) => {
          handleError(error, {
            showToast: false,
            defaultMsg: t("joinError"),
            onHandled: (message) => {
              setError("password", {
                type: "manual",
                message: message,
              })
              setValue("password", "")
            },
          })
        },
      }
    )
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-50/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">{t("title")}</CardTitle>
          <CardDescription>
            {t("description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col space-y-6"
          >
            <Controller
              name="password"
              control={control}
              rules={{
                required: t("passwordRequired"),
              }}
              render={({ field, fieldState }) => (
                <Field>
                  <FieldLabel>{t("passwordLabel")}</FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      type={showPassword ? "text" : "password"}
                      placeholder={t("passwordPlaceholder")}
                      {...field}
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        size="icon-xs"
                        type="button"
                        onClick={toggleShowPassword}
                      >
                        {showPassword ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
            <Button
              type="submit"
              disabled={isPending}
              className="w-full cursor-pointer gap-2"
            >
              <LogIn size={16} />
              {isPending ? t("submitting") : t("submit")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
