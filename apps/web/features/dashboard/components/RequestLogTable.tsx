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
  PATCH: "bg-orange-100 text-orange-700 hover:bg-orange-100 border-none shadow-none",
  DELETE: "bg-red-100 text-red-700 hover:bg-red-100 border-none shadow-none",
}

export function RequestLogTable({ workspaceId }: { workspaceId: string }) {
  const [page, setPage] = useState(1)
  const formatDate = useFormatDate()
  const { data, isPending, isError, refetch } = useGetRequestLogs(workspaceId, page)


  return (
    <Card className="border-slate-100 shadow-sm">
      <CardHeader className="pb-3 border-b border-slate-50">
        <CardTitle className="text-sm font-semibold text-slate-700">Recent Requests</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-100 hover:bg-transparent">
              <TableHead className="w-[180px] text-slate-500 font-medium">Time</TableHead>
              <TableHead className="w-[100px] text-slate-500 font-medium">Method</TableHead>
              <TableHead className="text-slate-500 font-medium">Path</TableHead>
              <TableHead className="w-[140px] text-slate-500 font-medium">IP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="border-slate-50 hover:bg-transparent">
                  <TableCell colSpan={4}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))}
            {!isPending && isError && (
              // 실패를 "로그 없음"으로 위장하지 않는다
              <TableRow className="border-transparent hover:bg-transparent">
                <TableCell colSpan={4} className="h-24 text-center text-slate-400 text-sm">
                  <div className="flex flex-col items-center gap-2">
                    <span>Failed to load requests</span>
                    <Button variant="outline" size="sm" onClick={() => refetch()}>
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
                  className="h-24 text-center text-slate-400 text-sm"
                >
                  No requests logged yet
                </TableCell>
              </TableRow>
            )}
            {!isPending &&
              !isError &&
              data?.data.map((log) => (
                <TableRow key={log.id} className="border-slate-50 hover:bg-slate-50/40">
                  <TableCell className="text-slate-500 text-sm font-light">
                    {formatDate(log.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Badge className={`${METHOD_STYLES[log.method] ?? ""} px-2 py-0.5 text-xs font-semibold rounded`}>
                      {log.method}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-slate-700 flex items-center gap-2 py-3">
                    <span className="truncate max-w-[400px]" title={log.path}>
                      {log.path}
                    </span>
                    {log.status === 404 && (
                      <Badge variant="outline" className="text-red-500 border-red-200 bg-red-50/30 text-[10px] px-1 py-0 shadow-none">
                        404
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-slate-400 text-xs font-mono">
                    {log.ip ?? "-"}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
        {data && data.meta.totalItems > REQUEST_LOGS_PAGE_SIZE && (
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-50 mt-4">
            <span className="text-xs text-slate-400 font-light">
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
