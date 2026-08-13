"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { ConfirmDialog } from "@/components/ConfirmDialog"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { UserMinus } from "lucide-react"
import { useMembers, useRemoveMember } from "../api/members"
import { useFormatDate } from "@/hooks/useFormatDate"
import type { WorkspaceMember } from "../types"

interface MembersSectionProps {
  workspaceId: string
}

export function MembersSection({ workspaceId }: MembersSectionProps) {
  const formatDate = useFormatDate()
  const t = useTranslations("WorkspaceSettings.members")
  const tCommon = useTranslations("WorkspaceSettings.common")
  const { data: members, isLoading, isError, refetch } = useMembers(workspaceId)
  const removeMember = useRemoveMember(workspaceId)

  // 추방 확인 다이얼로그 대상 멤버 (null이면 닫힘)
  const [removeTarget, setRemoveTarget] = useState<WorkspaceMember | null>(null)

  const handleRemove = () => {
    if (!removeTarget) return
    removeMember.mutate(
      { userId: removeTarget.userId },
      {
        onSuccess: () => {
          toast.success(t("removeSuccess"), { position: "top-center" })
          setRemoveTarget(null)
        },
        onError: () => {
          setRemoveTarget(null)
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
          <div className="space-y-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : isError ? (
          // 실패를 빈 테이블로 위장하면 "멤버가 사라졌다"고 오인한다
          <div className="flex flex-col items-start gap-2">
            <p className="text-sm text-muted-foreground">{tCommon("loadFailed")}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              {tCommon("retry")}
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("nickname")}</TableHead>
                <TableHead>{t("email")}</TableHead>
                <TableHead>{t("role")}</TableHead>
                <TableHead>{t("joinedAt")}</TableHead>
                <TableHead className="w-16 text-right">{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members?.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">
                    {member.nickname ?? "-"}
                  </TableCell>
                  <TableCell>{member.email ?? "-"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={member.role === "owner" ? "default" : "secondary"}
                    >
                      {member.role === "owner" ? t("roleOwner") : t("roleMember")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {member.joinedAt
                      ? formatDate(member.joinedAt)
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {member.role !== "owner" && (
                      <Button
                        variant="destructive"
                        size="icon-sm"
                        onClick={() => setRemoveTarget(member)}
                        aria-label={t("remove")}
                      >
                        <UserMinus />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <ConfirmDialog
        isOpen={removeTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null)
        }}
        title={t("removeDialogTitle")}
        description={t("removeDialogDescription", {
          name: removeTarget?.nickname ?? removeTarget?.email ?? "",
        })}
        cancelText={t("cancel")}
        confirmText={t("removeConfirm")}
        isLoading={removeMember.isPending}
        onConfirm={handleRemove}
      />
    </Card>
  )
}
