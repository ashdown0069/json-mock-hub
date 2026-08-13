"use client"

import { useEffect } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@workspace/ui/components/button"

/**
 * 로케일 레이아웃 하위에서 발생한 렌더/데이터 오류를 잡는 경계.
 * NextIntlClientProvider는 상위 layout에 있으므로 여기서는 번역을 쓸 수 있다.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations("Error")

  useEffect(() => {
    // 사용자에게는 노출하지 않고 로그로만 남긴다
    console.error("[app error boundary]", error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-xl font-semibold">{t("title")}</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        {t("description")}
      </p>
      <Button onClick={reset}>{t("retry")}</Button>
      {error.digest ? (
        <p className="text-xs text-muted-foreground">#{error.digest}</p>
      ) : null}
    </div>
  )
}
