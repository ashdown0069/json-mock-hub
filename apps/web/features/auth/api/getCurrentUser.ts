"use client"

import { useQuery } from "@tanstack/react-query"
import { getCurrentUserAction } from "../actions/auth"
import type { User } from "@/types/User"
import { authKeys } from "@/lib/queryKeys"

/**
 * 현재 로그인한 사용자 정보 가져오는 훅
 * 쿠키 -> Server Action (jose 복호화) -> TanStack Query
 */
export function useCurrentUser() {
  return useQuery<User | null>({
    queryKey: authKeys.user(),
    queryFn: async () => {
      const user = await getCurrentUserAction()
      return user
    },
    staleTime: 15 * 60 * 1000, // 15분 캐시 유효
    gcTime: 20 * 60 * 1000, // 20분 후 가비지 컬렉션
  })
}
