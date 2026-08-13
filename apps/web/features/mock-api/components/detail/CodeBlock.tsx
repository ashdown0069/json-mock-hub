"use client"

import { useEffect, useState } from "react"
import { useBoolean, useCopyToClipboard, useTimeout } from "usehooks-ts"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Check, Copy } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { getHighlighter } from "../../lib/shiki"

/** 복사 완료 체크 아이콘이 유지되는 시간(ms) */
const COPIED_RESET_MS = 1500

interface CodeBlockProps {
  code: string
  lang: "json" | "javascript" | "typescript" | "shellscript"
  className?: string
}

export function CodeBlock({ code, lang, className = "" }: CodeBlockProps) {
  const [html, setHtml] = useState<string | null>(null)
  const {
    value: copied,
    setTrue: markCopied,
    setFalse: clearCopied,
  } = useBoolean(false)
  const [, copyToClipboard] = useCopyToClipboard()
  const t = useTranslations("errors")

  // delay가 null이면 useTimeout은 타이머를 예약하지 않는다. 즉 복사 직후에만 예약되고,
  // 언마운트 시 clearTimeout이 보장된다 (기존 setTimeout에는 정리가 없었다).
  useTimeout(clearCopied, copied ? COPIED_RESET_MS : null)

  useEffect(() => {
    let cancelled = false
    getHighlighter()
      .then((highlighter) => {
        if (cancelled) return
        setHtml(highlighter.codeToHtml(code, { lang, theme: "github-light" }))
      })
      .catch(() => {
        // Shiki 로딩 실패 시 상태를 null로 유지해 기본 pre 태그 폴백이 렌더링되게 한다
      })
    return () => {
      cancelled = true
    }
  }, [code, lang])

  const handleCopy = async () => {
    // useCopyToClipboard는 예외를 던지지 않고 성공 여부를 boolean으로 돌려준다.
    if (await copyToClipboard(code)) {
      markCopied()
    } else {
      toast.error(t("copyFailed"))
    }
  }

  return (
    <div className="relative min-w-0 rounded-lg border bg-white">
      <Button
        variant="ghost"
        size="icon"
        aria-label="코드 복사"
        className="absolute top-3 right-3 z-10 h-8 w-8"
        onClick={handleCopy}
      >
        {copied ? (
          <Check size={14} className="text-emerald-600" />
        ) : (
          <Copy size={14} />
        )}
      </Button>

      {html ? (
        <div
          className={`overflow-auto p-4 text-sm [&_pre]:m-0 [&_pre]:!bg-transparent ${className}`}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <pre
          className={`overflow-auto p-4 font-mono text-sm text-slate-600 ${className}`}
        >
          {code}
        </pre>
      )}
    </div>
  )
}
