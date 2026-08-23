"use client"

import { useState } from "react"
import { useFormatDate } from "@/hooks/useFormatDate"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { ChevronLeft, ChevronRight } from "lucide-react"
import {
  useGetRequestLogs,
  REQUEST_LOGS_PAGE_SIZE,
} from "../api/getRequestLogs"

const METHOD_STYLES: Record<string, string> = {
  GET: "bg-blue-100 text-blue-700 hover:bg-blue-100 border-none shadow-none",
  POST: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none shadow-none",
  PUT: "bg-amber-100 text-amber-700 hover:bg-amber-100 border-none shadow-none",
  PATCH:
    "bg-orange-100 text-orange-700 hover:bg-orange-100 border-none shadow-none",
  DELETE: "bg-red-100 text-red-700 hover:bg-red-100 border-none shadow-none",
}

export function RequestLogTable({ workspaceId }: { workspaceId: string }) {
  const [page, setPage] = useState(1)
  const formatDate = useFormatDate({ includeTime: true })
  const { data, isPending, isError, refetch } = useGetRequestLogs(
    workspaceId,
    page
  )

  return (
    <Card className="flex flex-1 flex-col overflow-hidden border-slate-100 shadow-sm min-h-0">
      <CardHeader className="shrink-0 border-b border-slate-50 pb-3">
        <CardTitle className="text-sm font-semibold text-slate-700">
          Recent Requests
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col pt-4 min-h-0 overflow-hidden pb-4">
        <div className="relative flex-1 overflow-x-auto overflow-y-auto rounded-md border border-slate-100/80 min-h-0">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-slate-50/95 shadow-[0_1px_0_0_rgba(0,0,0,0.05)] backdrop-blur">
              <TableRow className="border-slate-100 hover:bg-transparent">
                <TableHead className="w-[200px] bg-slate-50/95 font-medium text-slate-500">
                  Time
                </TableHead>
                <TableHead className="w-[100px] bg-slate-50/95 font-medium text-slate-500">
                  Method
                </TableHead>
                <TableHead className="bg-slate-50/95 font-medium text-slate-500">
                  Path
                </TableHead>
                <TableHead className="w-[140px] bg-slate-50/95 font-medium text-slate-500">
                  IP
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow
                    key={i}
                    className="border-slate-50 hover:bg-transparent"
                  >
                    <TableCell colSpan={4}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  </TableRow>
                ))}
              {!isPending && isError && (
                // 실패를 "로그 없음"으로 위장하지 않는다
                <TableRow className="border-transparent hover:bg-transparent">
                  <TableCell
                    colSpan={4}
                    className="h-24 text-center text-sm text-slate-400"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <span>Failed to load requests</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetch()}
                      >
                        Retry
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {!isPending && !isError && data?.data.length === 0 && (
                <TableRow className="border-transparent hover:bg-transparent">
                  <TableCell
                    colSpan={4}
                    className="h-24 text-center text-sm text-slate-400"
                  >
                    No requests logged yet
                  </TableCell>
                </TableRow>
              )}
              {!isPending &&
                !isError &&
                data?.data.map((log) => (
                  <TableRow
                    key={log.id}
                    className="border-slate-50 hover:bg-slate-50/40"
                  >
                    <TableCell className="text-sm font-light text-slate-500">
                      {formatDate(log.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`${METHOD_STYLES[log.method] ?? ""} rounded px-2 py-0.5 text-xs font-semibold`}
                      >
                        {log.method}
                      </Badge>
                    </TableCell>
                    <TableCell className="flex items-center gap-2 py-3 font-mono text-xs text-slate-700">
                      <span className="max-w-[400px] truncate" title={log.path}>
                        {log.path}
                      </span>
                      {log.status === 404 && (
                        <Badge
                          variant="outline"
                          className="border-red-200 bg-red-50/30 px-1 py-0 text-[10px] text-red-500 shadow-none"
                        >
                          404
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-400">
                      {log.ip ?? "-"}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
        {data && data.meta.totalItems > REQUEST_LOGS_PAGE_SIZE && (
          <div className="shrink-0 mt-3 flex items-center justify-end gap-3 border-t border-slate-50 pt-3">
            <span className="text-xs font-light text-slate-400">
              Page {data.meta.page} of {data.meta.totalPages}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 border-slate-200 text-slate-600 disabled:opacity-50"
                disabled={!data.meta.hasPrev}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 border-slate-200 text-slate-600 disabled:opacity-50"
                disabled={!data.meta.hasNext}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
