import "server-only"
import { QueryClient } from "@tanstack/react-query"
import { serverAxiosInstance } from "@/lib/serverAxios"
import { browserKeys } from "@/lib/queryKeys"
import { FileItem } from "../types"

export const getBrowserItemsServer = async (
  workspaceId: string
): Promise<FileItem[]> => {
  const { data } = await serverAxiosInstance.get(
    `/${workspaceId}/filebrowser/getItems`
  )
  return data
}

export const prefetchBrowserItems = async (
  queryClient: QueryClient,
  workspaceId: string
) => {
  return queryClient.prefetchQuery({
    queryKey: browserKeys.all(workspaceId),
    queryFn: () => getBrowserItemsServer(workspaceId),
  })
}
