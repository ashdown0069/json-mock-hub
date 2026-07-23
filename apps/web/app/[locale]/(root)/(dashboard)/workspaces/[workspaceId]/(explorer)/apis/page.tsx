import React from "react"
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query"
import { ApisClient } from "./ApisClient"
import { prefetchBrowserItems } from "@/features/file-browser/api/getBrowserItems.server"

export default async function ApisPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>
}) {
  const { workspaceId } = await params
  const queryClient = new QueryClient()

  await prefetchBrowserItems(queryClient, workspaceId)

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ApisClient />
    </HydrationBoundary>
  )
}
