import { useQuery } from "@tanstack/react-query"
import { axiosInstance, type customAxiosError } from "@/lib/axios"
import { mockStateKeys } from "@/lib/queryKeys"
import type { EffectiveMockJson } from "@workspace/types"

export async function getEffectiveJson(
  workspaceId: string,
  path: string
): Promise<EffectiveMockJson> {
  const { data } = await axiosInstance.get(`/${workspaceId}/mockstate/effective`, {
    params: { path },
  })
  return data
}

export function useGetEffectiveJson(
  workspaceId: string,
  path: string,
  placeholderData: EffectiveMockJson
) {
  return useQuery<EffectiveMockJson, customAxiosError>({
    queryKey: mockStateKeys.effective(workspaceId, path),
    queryFn: () => getEffectiveJson(workspaceId, path),
    enabled: Boolean(workspaceId && path),
    placeholderData,
    refetchOnWindowFocus: "always",
    refetchOnReconnect: "always",
  })
}
