"use client"
// Since QueryClientProvider relies on useContext under the hood, we have to put 'use client' on top
import {
  defaultShouldDehydrateQuery,
  MutationCache,
  QueryClient,
  QueryClientProvider,
  environmentManager,
} from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { toast } from "sonner"
import axios from "axios"
import type { customAxiosError } from "@/lib/axios"

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, we usually want to set some default staleTime
        // above 0 to avoid refetching immediately on the client
        staleTime: 1000 * 60 * 30, // 30 minutes
        refetchOnWindowFocus: false,
        refetchOnMount: false,
      },
      dehydrate: {
        // include pending queries in dehydration
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
      },
    },
    mutationCache: new MutationCache({
      // 개별 mutation이 onError를 정의하지 않은 경우의 최종 방어선
      onError: (error) => {
        if (typeof window === "undefined") return

        let message = "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요."
        if (axios.isAxiosError(error)) {
          const axiosError = error as customAxiosError
          message = axiosError.response?.data?.message ?? message
        }
        toast.error(message, { position: "top-center" })
      },
    }),
  })
}

let browserQueryClient: QueryClient | undefined = undefined

export function getQueryClient() {
  if (environmentManager.isServer()) {
    // Server: always make a new query client
    return makeQueryClient()
  } else {
    // Browser: make a new query client if we don't already have one
    // This is very important, so we don't re-make a new client if React
    // suspends during the initial render. This may not be needed if we
    // have a suspense boundary BELOW the creation of the query client
    if (!browserQueryClient) browserQueryClient = makeQueryClient()
    return browserQueryClient
  }
}

export default function Providers({ children }: { children: React.ReactNode }) {
  // NOTE: Avoid useState when initializing the query client if you don't
  //       have a suspense boundary between this and the code that may
  //       suspend because React will throw away the client on the initial
  //       render if it suspends and there is no boundary
  const queryClient = getQueryClient()

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="top-right" />
      )}
    </QueryClientProvider>
  )
}
