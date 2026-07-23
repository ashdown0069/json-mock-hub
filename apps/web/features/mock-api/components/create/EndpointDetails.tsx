import React from "react"
import { useTranslations } from "next-intl"
import { Field, FieldLabel } from "@workspace/ui/components/field"
import {
  InputGroup,
  InputGroupInput,
} from "@workspace/ui/components/input-group"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { useCreateMockApiStore } from "../../store/useCreateMockApiStore"

export function EndpointDetails() {
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
