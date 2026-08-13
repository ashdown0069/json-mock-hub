"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Button } from "@workspace/ui/components/button"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { useGetWorkspace } from "@/features/workspace/api/getWorkspace"
import { useUpdateWorkspace } from "@/features/workspace/api/updateWorkspace"

interface GeneralSettingsSectionProps {
  workspaceId: string
}

/** 워크스페이스 일반 설정(이름) — 실제 조회/저장 동작 섹션 (owner 전용 설정 페이지). */
export function GeneralSettingsSection({ workspaceId }: GeneralSettingsSectionProps) {
  const t = useTranslations("WorkspaceSettings.general")
  const tCommon = useTranslations("WorkspaceSettings.common")
  const { data: workspace, isLoading, isError, refetch } = useGetWorkspace(workspaceId)
  const updateMutation = useUpdateWorkspace(workspaceId)

  const schema = z.object({ name: z.string().min(1, { message: t("nameRequired") }) })
  type FormValues = z.infer<typeof schema>

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { name: "" } })

  useEffect(() => {
    if (workspace?.name) reset({ name: workspace.name })
  }, [workspace?.name, reset])

  const onSubmit = (values: FormValues) => {
    updateMutation.mutate(
      { name: values.name.trim() },
      {
        onSuccess: () => {
          toast.success(t("saved"), { position: "top-center" })
          reset({ name: values.name.trim() })
        },
      }
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-10 w-full max-w-md" />
        ) : isError ? (
          // 실패를 빈 폼으로 위장하면 "설정이 초기화됐다"고 오인한다
          <div className="flex flex-col items-start gap-2">
            <p className="text-sm text-muted-foreground">{tCommon("loadFailed")}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              {tCommon("retry")}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="workspace-name">{t("nameLabel")}</Label>
              <Input
                id="workspace-name"
                type="text"
                className="max-w-md"
                placeholder={t("namePlaceholder")}
                aria-invalid={!!errors.name}
                {...register("name")}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>
            <Button type="submit" disabled={!isDirty || updateMutation.isPending}>
              {t("save")}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
