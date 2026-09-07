import React from "react"
import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { useCreateMockApiStore } from "../../store/useCreateMockApiStore"
import { cn } from "@workspace/ui/lib/utils"
import { MockResourceType } from "@workspace/types"
import { Layers, FileJson } from "lucide-react"

export function ResourceTypeSelector() {
  const t = useTranslations("MockApiDialog")
  const resourceType = useCreateMockApiStore((state) => state.resourceType)
  const setResourceType = useCreateMockApiStore((state) => state.setResourceType)

  const options: Array<{
    type: MockResourceType
    title: string
    desc: string
    icon: typeof Layers
  }> = [
    {
      type: "collection",
      title: t("resourceTypeCollection"),
      desc: t("resourceTypeCollectionDesc"),
      icon: Layers,
    },
    {
      type: "object",
      title: t("resourceTypeObject"),
      desc: t("resourceTypeObjectDesc"),
      icon: FileJson,
    },
  ]

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
            2
          </span>
          {t("resourceType")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {options.map((opt) => {
            const isSelected = resourceType === opt.type
            const Icon = opt.icon
            return (
              <button
                key={opt.type}
                type="button"
                data-testid={`resource-type-${opt.type}`}
                onClick={() => setResourceType(opt.type)}
                className={cn(
                  "flex flex-col items-start gap-2 rounded-lg border p-3.5 text-left transition-all",
                  "hover:border-primary/50 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isSelected
                    ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary"
                    : "border-border bg-card text-muted-foreground",
                )}
              >
                <div className="flex items-center gap-2 text-foreground font-medium text-sm">
                  <Icon
                    className={cn(
                      "size-4 shrink-0",
                      isSelected ? "text-primary" : "text-muted-foreground",
                    )}
                  />
                  <span>{opt.title}</span>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {opt.desc}
                </p>
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
