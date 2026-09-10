import { useQuery } from "@tanstack/react-query"
import { axiosInstance, type customAxiosError } from "@/lib/axios"
import { browserKeys } from "@/lib/queryKeys"
import { FileItem } from "../types"

export async function getBrowserItems(workspaceId: string): Promise<FileItem[]> {
  const { data } = await axiosInstance.get(`/${workspaceId}/filebrowser/getItems`)
  return data
}

export function useGetBrowserItems(workspaceId: string) {
  return useQuery<FileItem[], customAxiosError>({
    queryKey: browserKeys.all(workspaceId),
    queryFn: () => getBrowserItems(workspaceId),
    refetchOnWindowFocus: "always",
    refetchOnReconnect: "always",
  })
}
