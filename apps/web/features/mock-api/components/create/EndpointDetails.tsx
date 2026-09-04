import React from "react"
import { useTranslations } from "next-intl"
import { Field, FieldDescription, FieldLabel } from "@workspace/ui/components/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@workspace/ui/components/input-group"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { useCreateMockApiStore } from "../../store/useCreateMockApiStore"

interface EndpointDetailsProps {
  /** 실제 호출 URL의 접두어 (예: http://ws1.localhost:4001/api/shop/) */
  endpointPrefix: string
}

export function EndpointDetails({ endpointPrefix }: EndpointDetailsProps) {
  const t = useTranslations("MockApiDialog")
  const apiPath = useCreateMockApiStore((state) => state.apiPath)
  const setApiPath = useCreateMockApiStore((state) => state.setApiPath)

  // 선행 슬래시를 제거하여 endpointPrefix와의 결합 시 이중 슬래시 방지
  const cleanPath = apiPath.trim().replace(/^\/+/, "")
  const fullUrl = `${endpointPrefix}${cleanPath}`

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
            1
          </span>
          {t("endpointDetails")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Field>
          <FieldLabel>{t("apiPath")}</FieldLabel>
          <InputGroup>
            {/* 인풋 너비 확보를 위해 Addon에는 '/'만 노출 */}
            <InputGroupAddon className="font-mono text-xs text-muted-foreground select-none">
              /
            </InputGroupAddon>
            <InputGroupInput
              value={apiPath}
              onChange={(e) => setApiPath(e.target.value)}
              placeholder={t("apiPathPlaceholder")}
            />
          </InputGroup>
          <FieldDescription className="font-mono text-xs text-muted-foreground break-all">
            {fullUrl}
          </FieldDescription>
        </Field>
      </CardContent>
    </Card>
  )
}
