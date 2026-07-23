"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Check, Copy } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { getHighlighter } from "../../lib/shiki"

interface CodeBlockProps {
  code: string
  lang: "json" | "javascript" | "typescript"
  className?: string
}

export function CodeBlock({ code, lang, className = "" }: CodeBlockProps) {
  const [html, setHtml] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const t = useTranslations("errors")

  // 컴포넌트 마운트 및 코드/언어 변경 시 Shiki 하이라이터를 사용해 코드를 HTML로 변환합니다.
  useEffect(() => {
    let cancelled = false
    getHighlighter()
      .then((highlighter) => {
        if (cancelled) return
        // Shiki 하이라이터를 사용해 동적으로 HTML을 생성합니다.
        setHtml(highlighter.codeToHtml(code, { lang, theme: "github-light" }))
      })
      .catch(() => {
        // Shiki 로딩이 실패한 경우, 상태를 null로 유지하여 기본 pre 태그 폴백이 렌더링되게 합니다.
      })
    return () => {
      cancelled = true
    }
  }, [code, lang])

  // 클립보드에 코드를 복사하고 피드백 상태를 제어하는 핸들러입니다.
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error(t("copyFailed"))
    }
  }

  return (
    <div className="relative min-w-0 rounded-lg border bg-white">
      {/* 우측 상단 코드 복사 버튼 */}
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

      {/* Shiki 하이라이트된 HTML이 준비되면 렌더링하고, 로딩 전이나 실패 시 pre 태그로 폴백합니다. */}
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
