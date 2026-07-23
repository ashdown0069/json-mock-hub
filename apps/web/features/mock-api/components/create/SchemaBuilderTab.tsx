import React from "react"
import { useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"
import { Button } from "@workspace/ui/components/button"
import { useCreateMockApiStore } from "../../store/useCreateMockApiStore"
import { CreateMockApiPayload } from "../../types"
import { isValidItemName } from "@/lib/validateItemName"
import { EndpointDetails } from "./EndpointDetails"
import { SchemaEditor } from "./SchemaEditor"
import { GenerationOptions } from "./GenerationOptions"
import { generateDummyData } from "@workspace/mockgen/generateData"
import { fieldsToSchema } from "@workspace/mockgen/convertSchema"

interface SchemaBuilderTabProps {
  onClose: () => void
  onCreate: (payload: CreateMockApiPayload) => void
  /** EndpointDetails에 표시할 실제 목서버 URL 접두어 */
  endpointPrefix: string
  submitLabel?: string
}

export function SchemaBuilderTab({
  onClose,
  onCreate,
  endpointPrefix,
  submitLabel,
}: SchemaBuilderTabProps) {
  const locale = useLocale()
  const tErr = useTranslations("errors")
  const t = useTranslations("MockApiDialog")
  const apiPath = useCreateMockApiStore((state) => state.apiPath)
  const fields = useCreateMockApiStore((state) => state.fields)
  const itemCount = useCreateMockApiStore((state) => state.itemCount)
  const enablePagination = useCreateMockApiStore(
    (state) => state.enablePagination
  )
  const pageParam = useCreateMockApiStore((state) => state.pageParam)
  const limitParam = useCreateMockApiStore((state) => state.limitParam)

  // 엔드포인트를 최종 생성하고 페이로드를 조립해 부모 onCreate 콜백을 호출하는 핸들러
  const handleCreate = () => {
    // 슬래시(/) 프리픽스를 제거해 단일 파일/엔드포인트 명칭을 얻습니다.
    const name = apiPath.trim().replace(/^\//, "")
    if (!name) return

    // 명칭 규칙 유효성 검사
    if (!isValidItemName(name)) {
      toast.error(tErr("itemNameRule"), { position: "top-center" })
      return
    }

    // 설정된 필드 및 개수 정보를 바탕으로 더미 데이터를 생성합니다.
    const json = generateDummyData(fields, itemCount[0] ?? 10, locale)

    // DB 저장을 위해 프론트가 생성 시각이나 ID를 조작하지 않고, 핵심 스키마와 데이터 정보만 담아 백엔드로 보냅니다.
    onCreate({
      name,
      schema: fieldsToSchema(fields),
      json,
      options: {
        pagination: enablePagination,
        ...(enablePagination && {
          paginationParams: {
            pageParam: pageParam,
            limitParam: limitParam,
          },
        }),
      },
      fieldDefs: fields,
    })
  }

  // 이름 있는 최상위 필드가 없으면 [{}] 같은 빈 응답이 생성되므로 제출을 막습니다
  const hasNamedField = fields.some((field) => field.name.trim() !== "")

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-muted/10">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="flex flex-col gap-6 lg:col-span-7">
            <EndpointDetails />
            <SchemaEditor />
          </div>
          <div className="flex flex-col gap-6 lg:col-span-5">
            <GenerationOptions />
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-3 border-t border-border bg-background p-4">
        <Button variant="ghost" onClick={onClose}>
          {t("cancel")}
        </Button>
        <Button onClick={handleCreate} disabled={!apiPath || !hasNamedField}>
          {submitLabel ?? t("submitCreate")}
        </Button>
      </div>
    </div>
  )
}
