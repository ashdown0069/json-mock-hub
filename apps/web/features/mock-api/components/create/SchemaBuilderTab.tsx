import React from "react"
import { useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"
import { Button } from "@workspace/ui/components/button"
import { useCreateMockApiStore } from "../../store/useCreateMockApiStore"
import { CreateMockApiPayload } from "../../types"
import { isValidItemName } from "@/lib/validateItemName"
import { EndpointDetails } from "./EndpointDetails"
import { ResourceTypeSelector } from "./ResourceTypeSelector"
import { SchemaEditor } from "./SchemaEditor"
import { GenerationOptions } from "./GenerationOptions"
import { generateDummyData, generateSingleObjectData } from "@workspace/mockgen/generateData"
import { fieldsToSchema, withIdField } from "@workspace/mockgen/convertSchema"
import { findDuplicateFieldIds, normalizeFieldNames } from "@workspace/types"

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
  const resourceType = useCreateMockApiStore((state) => state.resourceType)
  const fields = useCreateMockApiStore((state) => state.fields)
  const itemCount = useCreateMockApiStore((state) => state.itemCount)
  const enablePagination = useCreateMockApiStore(
    (state) => state.enablePagination
  )
  const pageParam = useCreateMockApiStore((state) => state.pageParam)
  const limitParam = useCreateMockApiStore((state) => state.limitParam)
  const enableSort = useCreateMockApiStore((state) => state.enableSort)
  const sortParam = useCreateMockApiStore((state) => state.sortParam)
  const orderParam = useCreateMockApiStore((state) => state.orderParam)
  const enableSearch = useCreateMockApiStore((state) => state.enableSearch)
  const searchParam = useCreateMockApiStore((state) => state.searchParam)

  // 중복 판정은 @workspace/types가 단독 소유한다 —
  // 여기서 다시 구현하면 서버 DTO 검증과 조용히 어긋난다.
  // Zustand 파생 셀렉터로 만들면 매번 새 Set이 나와 참조 비교가 깨지므로
  // 컴포넌트에서 useMemo로 계산한다.
  const duplicateFieldIds = React.useMemo(
    () => findDuplicateFieldIds(fields),
    [fields]
  )

  const handleCreate = () => {
    // apiPath에서 선행 슬래시를 제거해 파일명으로 쓸 수 있는 이름을 얻는다
    const name = apiPath.trim().replace(/^\//, "")
    if (!name) return

    if (!isValidItemName(name)) {
      toast.error(tErr("itemNameRule"), { position: "top-center" })
      return
    }

    const isObject = resourceType === "object"

    // 컬렉션 모드에서만 최상위 id가 시스템 예약어이므로 차단한다.
    // 단일 객체 모드에서는 사용자가 정의한 id 필드를 온전히 허용한다.
    const hasReservedId =
      !isObject && fields.some((f) => f.name.trim().toLowerCase() === "id")
    if (hasReservedId) {
      toast.error(tErr("idFieldReserved"), { position: "top-center" })
      return
    }

    // 스키마 키·목데이터 키·fieldDefs 이름이 갈리지 않도록 한 번만 정규화한다.
    const normalizedFields = normalizeFieldNames(fields)

    const json = isObject
      ? generateSingleObjectData(normalizedFields, locale)
      : generateDummyData(normalizedFields, itemCount[0] ?? 10, locale)

    const schema = isObject
      ? fieldsToSchema(normalizedFields)
      : withIdField(fieldsToSchema(normalizedFields))

    const options = isObject
      ? {
          resourceType: "object" as const,
          pagination: false,
          sort: false,
          search: false,
        }
      : {
          resourceType: "collection" as const,
          pagination: enablePagination,
          ...(enablePagination && {
            paginationParams: {
              pageParam: pageParam,
              limitParam: limitParam,
            },
          }),
          sort: enableSort,
          ...(enableSort && {
            sortParams: { sortParam, orderParam },
          }),
          search: enableSearch,
          ...(enableSearch && {
            searchParams: { searchParam },
          }),
        }

    onCreate({
      name,
      schema,
      json,
      options,
      fieldDefs: normalizedFields,
    })
  }

  // 이름 있는 최상위 필드가 없으면 [{}] 또는 {} 같은 빈 응답이 생성되므로 제출을 막는다
  const hasNamedField = fields.some((field) => field.name.trim() !== "")

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-muted/10">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="flex flex-col gap-6 lg:col-span-7">
            <EndpointDetails endpointPrefix={endpointPrefix} />
            <ResourceTypeSelector />
            <SchemaEditor duplicateFieldIds={duplicateFieldIds} />
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
        <Button
          onClick={handleCreate}
          disabled={!apiPath || !hasNamedField || duplicateFieldIds.size > 0}
        >
          {submitLabel ?? t("submitCreate")}
        </Button>
      </div>
    </div>
  )
}
