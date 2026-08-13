"use client"

import { useTranslations } from "next-intl"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Badge } from "@workspace/ui/components/badge"
import { Separator } from "@workspace/ui/components/separator"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { MCP_TOOL_NAMES } from "../data/tools"

/** 설치 이후 단계 — 어떤 도구가 있고 어떻게 부르는지 안내한다. */
export function UsageCard() {
  const t = useTranslations("WorkspaceMcp")

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("usage.title")}</CardTitle>
        <CardDescription>{t("usage.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="tools">
          <TabsList>
            <TabsTrigger value="tools" className="cursor-pointer">
              {t("usage.tabTools")}
            </TabsTrigger>
            <TabsTrigger value="examples" className="cursor-pointer">
              {t("usage.tabExamples")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tools" className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">
                    {t("usage.colTool")}
                  </TableHead>
                  <TableHead>{t("usage.colDesc")}</TableHead>
                  <TableHead>{t("usage.colExample")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MCP_TOOL_NAMES.map((name) => (
                  <TableRow key={name}>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {name}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {t(`tools.${name}.desc`)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {t(`tools.${name}.example`)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="examples" className="space-y-4 pt-4">
            {MCP_TOOL_NAMES.map((name) => (
              <div key={name} className="rounded-lg border p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Badge variant="secondary" className="font-mono text-xs">
                    {name}
                  </Badge>
                </div>
                <p className="rounded-md bg-muted/40 px-3 py-2 text-sm">
                  “{t(`tools.${name}.example`)}”
                </p>
              </div>
            ))}
          </TabsContent>
        </Tabs>

        <Separator className="my-6" />

        <div className="rounded-lg border border-dashed p-4">
          <h3 className="mb-2 text-sm font-semibold">
            {t("codeOptions.title")}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t("codeOptions.description")}
          </p>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            <li>• {t("codeOptions.lang")}</li>
            <li>• {t("codeOptions.client")}</li>
            <li>• {t("codeOptions.validation")}</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
