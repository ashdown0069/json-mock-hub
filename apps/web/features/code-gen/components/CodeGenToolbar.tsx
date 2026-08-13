"use client"

import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import type { CodeLang, HttpClientLib, ValidationLib } from "@workspace/codegen"

interface CodeGenToolbarProps {
  lang: CodeLang
  onLangChange: (lang: CodeLang) => void
  validationLib: ValidationLib
  onValidationLibChange: (lib: ValidationLib) => void
  clientLib: HttpClientLib
  onClientLibChange: (lib: HttpClientLib) => void
}

const LANGS: { value: CodeLang; label: string }[] = [
  { value: "ts", label: "TypeScript" },
  { value: "js", label: "JavaScript" },
]

const VALIDATION_LIBS: ValidationLib[] = ["zod", "yup", "joi"]
const CLIENT_LIBS: HttpClientLib[] = ["axios", "fetch"]

// 기본 TabsTrigger는 좌우 패딩이 px-1.5(6px)이고 비활성 글자색이 text-foreground/60이라
// 탭 경계와 선택 상태가 잘 안 보인다. 패딩을 px-4로 넓히고 비활성/활성 대비를 키운다.
const LANG_TAB_CLASS =
  "h-full cursor-pointer px-4 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 data-active:bg-white data-active:font-semibold data-active:text-slate-900"

/**
 * 코드 생성 옵션(언어 / 검증 라이브러리 / HTTP 클라이언트)을 한 줄에 모은 툴바입니다.
 * 자체 상태를 갖지 않으며 값과 변경 콜백을 상위 CodeGenPanel로부터 받습니다.
 */
export function CodeGenToolbar({
  lang,
  onLangChange,
  validationLib,
  onValidationLibChange,
  clientLib,
  onClientLibChange,
}: CodeGenToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
      <Tabs value={lang} onValueChange={(v) => onLangChange(v as CodeLang)}>
        <TabsList className="bg-slate-100">
          {LANGS.map((item) => (
            <TabsTrigger
              key={item.value}
              value={item.value}
              className={LANG_TAB_CLASS}
            >
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex items-center gap-2">
        <Select
          value={validationLib}
          onValueChange={(v) => onValidationLibChange(v as ValidationLib)}
        >
          <SelectTrigger aria-label="Validation library" className="w-26">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VALIDATION_LIBS.map((libName) => (
              <SelectItem key={libName} value={libName}>
                {libName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={clientLib}
          onValueChange={(v) => onClientLibChange(v as HttpClientLib)}
        >
          <SelectTrigger aria-label="HTTP client" className="w-26">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CLIENT_LIBS.map((libName) => (
              <SelectItem key={libName} value={libName}>
                {libName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
