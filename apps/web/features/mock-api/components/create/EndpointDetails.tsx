import React from "react"
import { useTranslations } from "next-intl"
import { Field, FieldLabel } from "@workspace/ui/components/field"
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
            {/* 하위 폴더에서 생성 시 최종 경로가 불명확해 이름에 "/"를 넣는 실수를 방지하기 위해 접두어를 표시한다 */}
            <InputGroupAddon className="font-mono text-xs text-muted-foreground">
              {endpointPrefix}
            </InputGroupAddon>
            <InputGroupInput
              value={apiPath}
              onChange={(e) => setApiPath(e.target.value)}
              placeholder={t("apiPathPlaceholder")}
            />
          </InputGroup>
        </Field>
      </CardContent>
    </Card>
  )
}
