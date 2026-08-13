"use client"

import { useMemo, useState } from "react"
import { FileItem } from "../types"
import { buildTree } from "../utils/tree.utils"
import { useGetBrowserItems } from "../api/getBrowserItems"
import { useFileBrowserSSE } from "./useFileBrowserSSE"

// 서버 데이터 + SSE 동기화 + 임시 노드를 합성해 트리 데이터를 만드는 훅
export function useFileTreeData(workspaceId: string) {
  const {
    data: flatItems = [],
    isLoading,
    isError,
    refetch,
  } = useGetBrowserItems(workspaceId)
  useFileBrowserSSE(workspaceId)

  const [tempNode, setTempNode] = useState<FileItem | null>(null)

  const treeData = useMemo(() => {
    const merged = tempNode ? [...flatItems, tempNode] : flatItems
    return buildTree(merged)
  }, [flatItems, tempNode])

  return { flatItems, treeData, isLoading, isError, refetch, tempNode, setTempNode }
}
