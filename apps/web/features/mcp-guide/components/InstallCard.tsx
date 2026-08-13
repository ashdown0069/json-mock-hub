"use client"

import { useBoolean } from "usehooks-ts"
import { useTranslations } from "next-intl"
import { Plug } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Separator } from "@workspace/ui/components/separator"
import { ConfirmDialog } from "@/components/ConfirmDialog"
import { useFormatDate } from "@/hooks/useFormatDate"
import { CodeBlock } from "@/features/mock-api/components/detail/CodeBlock"
import { buildMcpAddCommand, buildMcpServerJson } from "../lib/mcpConfig"
import { useWorkspaceApiKey, useReissueApiKey } from "../api/apiKey"

interface InstallCardProps {
  workspaceId: string
}

/** mcp는 배포되지 않으므로 clone 전제를 먼저 밝히고,
 *  설정 파일에 붙여넣는 방법과 Claude Code CLI 방법을 위에서 아래로 이어 안내한다.
 *  키가 바뀌면 두 안내가 동시에 무효가 되므로 재발급도 같은 카드에 둔다. */
export function InstallCard({ workspaceId }: InstallCardProps) {
  const t = useTranslations("WorkspaceMcp")
  const formatDate = useFormatDate()
  const { data, isLoading } = useWorkspaceApiKey(workspaceId)
  const reissueMutation = useReissueApiKey(workspaceId)
  const {
    value: isConfirmOpen,
    setValue: setIsConfirmOpen,
    setTrue: openConfirm,
    setFalse: closeConfirm,
  } = useBoolean(false)

  const handleReissue = () => {
    reissueMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success(t("apiKey.reissueSuccess"), { position: "top-center" })
        closeConfirm()
      },
      onError: () => {
        closeConfirm()
      },
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plug size={18} /> {t("install.title")}
        </CardTitle>
        <CardDescription>{t("install.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 두 방법 모두 로컬 저장소가 있어야 하므로 공통 전제를 먼저 둔다 */}
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">{t("install.prereqTitle")}</h3>
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            <li>{t("install.step1")}</li>
            <li>{t("install.step2")}</li>
          </ol>
        </section>

        {/* 로딩 중 · 정상 · 조회 실패(비멤버 등) 세 갈래.
            키가 없으면 두 방법 모두 만들 수 없으므로 설치 섹션 전체를 대체한다. */}
        {isLoading ? (
          <Skeleton className="h-72 w-full" />
        ) : data ? (
          <>
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">
                {t("install.json.title")}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t("install.json.description")}
              </p>
              <CodeBlock
                code={buildMcpServerJson(workspaceId, data.apiKey)}
                lang="json"
              />
              <p className="text-xs text-muted-foreground">
                {t("install.json.windowsPathNote")}
              </p>
            </section>

            <Separator />

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">{t("install.cli.title")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("install.cli.description")}
              </p>
              <CodeBlock
                code={buildMcpAddCommand(workspaceId, data.apiKey)}
                lang="shellscript"
              />
            </section>
          </>
        ) : (
          <p className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            {t("apiKeyUnavailable")}
          </p>
        )}

        <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          {t("install.securityNote")}
        </p>
        <p className="text-xs text-muted-foreground">{t("install.note")}</p>

        {/* 재발급하면 위 두 안내의 키가 동시에 바뀌므로 같은 카드에 둔다 */}
        {data && (
          <div className="flex items-center justify-between border-t pt-4">
            <p className="text-xs text-muted-foreground">
              {data.issuedAt
                ? t("apiKey.status", { issuedAt: formatDate(data.issuedAt) })
                : null}
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={openConfirm}
              disabled={reissueMutation.isPending}
            >
              {t("apiKey.reissue")}
            </Button>
          </div>
        )}
      </CardContent>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        title={t("apiKey.reissueDialogTitle")}
        description={t("apiKey.reissueDialogDescription")}
        cancelText={t("apiKey.cancel")}
        confirmText={t("apiKey.reissueConfirm")}
        isLoading={reissueMutation.isPending}
        onConfirm={handleReissue}
      />
    </Card>
  )
}
