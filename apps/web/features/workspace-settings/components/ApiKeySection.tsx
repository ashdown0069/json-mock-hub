"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { ConfirmDialog } from "@/components/ConfirmDialog"
import { useWorkspaceApiKey, useReissueApiKey } from "../api/apiKey"
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler"
import { formatDate } from "@/lib/utils"

interface ApiKeySectionProps {
  workspaceId: string
}

/**
 * MCP 등 외부 클라이언트용 워크스페이스 API 키 섹션 (owner 전용 설정 페이지).
 * 키는 워크스페이스 생성 시 자동 발급되어 항상 존재하며, 여기서는 확인·복사·재발급만 제공한다.
 */
export function ApiKeySection({ workspaceId }: ApiKeySectionProps) {
  const t = useTranslations("WorkspaceSettings.apiKey")
  const { data, isLoading } = useWorkspaceApiKey(workspaceId)
  const reissueMutation = useReissueApiKey(workspaceId)
  const handleApiError = useApiErrorHandler()

  // 파괴적 액션(재발급) 확인용 Dialog 오픈 상태
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  const handleReissue = () => {
    reissueMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success(t("reissueSuccess"), { position: "top-center" })
        setIsConfirmOpen(false)
      },
      onError: (error) => {
        handleApiError(error)
        setIsConfirmOpen(false)
      },
    })
  }

  const handleCopy = async () => {
    if (!data?.apiKey) return
    try {
      await navigator.clipboard.writeText(data.apiKey)
      toast.success(t("copied"), { position: "top-center" })
    } catch {
      toast.error(t("copyFailed"), { position: "top-center" })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading || !data ? (
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-10 w-24" />
          </div>
        ) : (
          <>
            {data.issuedAt && (
              <p className="text-sm text-muted-foreground">
                {t("status", { issuedAt: formatDate(data.issuedAt) })}
              </p>
            )}

            <div className="flex items-center gap-2">
              <code className="flex-1 overflow-x-auto rounded bg-muted px-2 py-1.5 text-xs break-all select-all">
                {data.apiKey}
              </code>
              <Button size="sm" variant="outline" onClick={handleCopy}>
                {t("copy")}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{t("mcpHint")}</p>

            <Button
              onClick={() => setIsConfirmOpen(true)}
              disabled={reissueMutation.isPending}
            >
              {t("reissue")}
            </Button>
          </>
        )}
      </CardContent>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        title={t("reissueDialogTitle")}
        description={t("reissueDialogDescription")}
        cancelText={t("cancel")}
        confirmText={t("reissueConfirm")}
        isLoading={reissueMutation.isPending}
        onConfirm={handleReissue}
      />
    </Card>
  )
}
