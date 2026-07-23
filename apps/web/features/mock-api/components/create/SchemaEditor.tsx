import React from "react"
import { useTranslations } from "next-intl"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { FieldSchema, FIELD_TYPES, FieldType } from "@/types/schema"
import { useCreateMockApiStore } from "../../store/useCreateMockApiStore"
import { FAKER_BY_TYPE } from "@workspace/mockgen/fakerMethods"

const SchemaFieldRow = ({
  field,
  depth,
}: {
  field: FieldSchema
  depth: number
}) => {
  const t = useTranslations("MockApiDialog")
  const updateField = useCreateMockApiStore((state) => state.updateField)
  const removeField = useCreateMockApiStore((state) => state.removeField)
  const addSubfield = useCreateMockApiStore((state) => state.addSubfield)
  const changeFieldType = useCreateMockApiStore((state) => state.changeFieldType)

  const handleTypeChange = (newType: string) => {
    changeFieldType(field.id, newType as FieldType)
  }

  return (
    <div className="group flex items-center gap-2">
      {depth > 0 && (
        <div
          style={{ width: depth * 24 }}
          className="flex h-full shrink-0 items-center justify-end pr-2"
        >
          <div className="mb-1 h-3 w-3 rounded-bl-sm border-b-2 border-l-2 border-border opacity-50" />
        </div>
      )}
      <Input
        type="text"
        value={field.name}
        onChange={(e) => updateField(field.id, "name", e.target.value)}
        placeholder={t("fieldNamePlaceholder")}
        className="flex-1 font-mono text-sm"
      />
      <Select value={field.type} onValueChange={handleTypeChange}>
        <SelectTrigger className="w-[110px] shrink-0 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FIELD_TYPES.map((t) => (
            <SelectItem key={t} value={t}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {field.type !== "object" && field.type !== "array" && (
        <Select
          value={field.fakerMethod || "none"}
          onValueChange={(v) => updateField(field.id, "fakerMethod", v)}
        >
          <SelectTrigger className="w-[160px] shrink-0 text-sm">
            <SelectValue placeholder={t("fakerMethodPlaceholder")} />
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            <SelectItem value="none">{t("fakerNone")}</SelectItem>
            {Object.entries(FAKER_BY_TYPE[field.type] || {}).map(
              ([mod, methods]) => (
                <SelectGroup key={mod}>
                  <SelectLabel className="capitalize">{mod}</SelectLabel>
                  {methods.map((method) => (
                    <SelectItem
                      key={`${mod}.${method}`}
                      value={`${mod}.${method}`}
                    >
                      {method}
                    </SelectItem>
                  ))}
                </SelectGroup>
              )
            )}
          </SelectContent>
        </Select>
      )}

      {(field.type === "object" || field.type === "array") && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => addSubfield(field.id)}
          className="size-8 shrink-0 text-muted-foreground hover:bg-primary/10 hover:text-primary"
        >
          <Plus className="size-4" />
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => removeField(field.id)}
        className="size-8 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  )
}

const SchemaFieldList = ({
  fields,
  depth = 0,
}: {
  fields: FieldSchema[]
  depth?: number
}) => {
  return (
    <div className="flex flex-col gap-2">
      {fields.map((field) => (
        <div key={field.id} className="flex flex-col gap-2">
          <SchemaFieldRow field={field} depth={depth} />
          {(field.type === "object" || field.type === "array") &&
            field.fields &&
            field.fields.length > 0 && (
              <div className="mt-2 w-full">
                <SchemaFieldList fields={field.fields} depth={depth + 1} />
              </div>
            )}
        </div>
      ))}
    </div>
  )
}

export function SchemaEditor() {
  const t = useTranslations("MockApiDialog")
  const fields = useCreateMockApiStore((state) => state.fields)
  const addField = useCreateMockApiStore((state) => state.addField)

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
            2
          </span>
          {t("dataSchema")}
        </CardTitle>
        <Button variant="outline" size="sm" onClick={addField} className="h-8">
          <Plus className="mr-1 size-4" /> {t("addField")}
        </Button>
      </CardHeader>
      <CardContent className="flex-1 pb-6">
        {fields.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-border py-8 text-center text-sm text-muted-foreground">
            {t("emptyFields")}
          </div>
        ) : (
          <SchemaFieldList fields={fields} />
        )}
      </CardContent>
    </Card>
  )
}
