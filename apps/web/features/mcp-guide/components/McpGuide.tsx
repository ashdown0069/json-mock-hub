"use client"

import { useTranslations } from "next-intl"
import { Plug } from "lucide-react"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@workspace/ui/components/card"
import { Badge } from "@workspace/ui/components/badge"
import { Separator } from "@workspace/ui/components/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@workspace/ui/components/table"
import { CodeBlock } from "@/features/mock-api/components/detail/CodeBlock"
import { buildMcpConfigJson } from "../lib/mcpConfig"
import { MCP_TOOL_NAMES } from "../data/tools"

interface McpGuideProps {
  workspaceId: string
  apiKey: string
}

export function McpGuide({ workspaceId, apiKey }: McpGuideProps) {
  const t = useTranslations("WorkspaceMcp")

  return (
    <div className="grid max-w-4xl gap-6">
      {/* 설치 — API 키·워크스페이스 ID가 자동 주입된 설정을 그대로 복사한다 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plug size={18} /> {t("install.title")}
          </CardTitle>
          <CardDescription>{t("install.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="list-decimal space-y-2 pl-5 text-sm">
            <li>{t("install.step1")}</li>
            <li>{t("install.step2")}</li>
          </ol>
          <CodeBlock code={buildMcpConfigJson(workspaceId, apiKey)} lang="json" />
          <p className="text-xs text-muted-foreground">{t("install.note")}</p>
        </CardContent>
      </Card>

      {/* 사용법 */}
      <Card>
        <CardHeader>
          <CardTitle>{t("usage.title")}</CardTitle>
          <CardDescription>{t("usage.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="tools">
            <TabsList>
              <TabsTrigger value="tools" className="cursor-pointer">{t("usage.tabTools")}</TabsTrigger>
              <TabsTrigger value="examples" className="cursor-pointer">{t("usage.tabExamples")}</TabsTrigger>
            </TabsList>

            <TabsContent value="tools" className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">{t("usage.colTool")}</TableHead>
                    <TableHead>{t("usage.colDesc")}</TableHead>
                    <TableHead>{t("usage.colExample")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MCP_TOOL_NAMES.map((name) => (
                    <TableRow key={name}>
                      <TableCell>
                        <Badge variant="secondary" className="font-mono text-xs">{name}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{t(`tools.${name}.desc`)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{t(`tools.${name}.example`)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="examples" className="space-y-4 pt-4">
              {MCP_TOOL_NAMES.map((name) => (
                <div key={name} className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Badge variant="secondary" className="font-mono text-xs">{name}</Badge>
                  </div>
                  <p className="rounded-md bg-muted/40 px-3 py-2 text-sm">“{t(`tools.${name}.example`)}”</p>
                </div>
              ))}
            </TabsContent>
          </Tabs>

          <Separator className="my-6" />

          <div className="rounded-lg border border-dashed p-4">
            <h3 className="mb-2 text-sm font-semibold">{t("codeOptions.title")}</h3>
            <p className="text-sm text-muted-foreground">{t("codeOptions.description")}</p>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              <li>• {t("codeOptions.lang")}</li>
              <li>• {t("codeOptions.client")}</li>
              <li>• {t("codeOptions.validation")}</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
