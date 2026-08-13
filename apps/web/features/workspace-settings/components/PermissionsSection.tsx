"use client"

import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { Label } from "@workspace/ui/components/label"
import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { useRoles, useUpdateRole } from "../api/roles"

const permissionsSchema = z.object({
  canCreate: z.boolean(),
  canRename: z.boolean(),
  canMove: z.boolean(),
  canDelete: z.boolean(),
  canUpdate: z.boolean(),
})

type PermissionsFormValues = z.infer<typeof permissionsSchema>

const PERMISSION_KEYS = [
  "canCreate",
  "canRename",
  "canMove",
  "canDelete",
  "canUpdate",
] as const

interface PermissionsSectionProps {
  workspaceId: string
}

export function PermissionsSection({ workspaceId }: PermissionsSectionProps) {
  const t = useTranslations("WorkspaceSettings.permissions")
  const tCommon = useTranslations("WorkspaceSettings.common")
  const { data: roles, isLoading, isError, refetch } = useRoles(workspaceId)
  const updateRole = useUpdateRole(workspaceId)

  // owner 역할은 항상 전권이므로 UI에서 다루지 않고 member 역할만 편집 대상
  const memberRole = roles?.find((role) => role.role === "member")

  const form = useForm<PermissionsFormValues>({
    resolver: zodResolver(permissionsSchema),
    defaultValues: {
      canCreate: false,
      canRename: false,
      canMove: false,
      canDelete: false,
      canUpdate: false,
    },
    // 서버 데이터가 로드/재조회될 때 폼 값을 동기화 — 저장 성공 후
    // invalidate → refetch → values 갱신으로 dirty 상태가 자동 해제된다
    values: memberRole
      ? {
          canCreate: memberRole.canCreate,
          canRename: memberRole.canRename,
          canMove: memberRole.canMove,
          canDelete: memberRole.canDelete,
          canUpdate: memberRole.canUpdate,
        }
      : undefined,
  })

  const onSubmit = (data: PermissionsFormValues) => {
    if (!memberRole) return
    updateRole.mutate(
      { roleId: memberRole.id, permissions: data },
      {
        onSuccess: () => {
          toast.success(t("saveSuccess"), { position: "top-center" })
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
        {isError ? (
          // isError를 먼저 보지 않으면 memberRole이 undefined로 남아 스켈레톤이 영구히 표시된다
          <div className="flex flex-col items-start gap-2">
            <p className="text-sm text-muted-foreground">{tCommon("loadFailed")}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              {tCommon("retry")}
            </Button>
          </div>
        ) : isLoading || !memberRole ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-6 w-64" />
          </div>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-3">
              {PERMISSION_KEYS.map((key) => (
                <Controller
                  key={key}
                  control={form.control}
                  name={key}
                  render={({ field }) => (
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id={`permission-${key}`}
                        checked={field.value}
                        onCheckedChange={(checked) =>
                          field.onChange(checked === true)
                        }
                      />
                      <div className="grid gap-0.5">
                        <Label htmlFor={`permission-${key}`}>
                          {t(`${key}.label`)}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {t(`${key}.description`)}
                        </p>
                      </div>
                    </div>
                  )}
                />
              ))}
            </div>
            <Button
              type="submit"
              disabled={!form.formState.isDirty || updateRole.isPending}
            >
              {updateRole.isPending ? t("saving") : t("save")}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
