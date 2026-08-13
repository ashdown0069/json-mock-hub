import { useTranslations } from "next-intl"
import { toast } from "sonner"
import type { customAxiosError } from "@/lib/axios"

interface ErrorHandlerOptions {
  showToast?: boolean
  defaultMsg?: string
  onHandled?: (message: string, code?: string) => void
}

/**
 * mutation 에러 토스트 규약
 *
 * 1. 토스트는 mutation 훅의 onError 한 곳에서만 띄운다.
 *    (features/{feature}/api/*.ts 안의 useMutation({ onError }))
 * 2. 호출부 mutate(vars, { onError })는 UI 상태 정리만 한다.
 *    다이얼로그 닫기, 폼 필드 에러 설정 등.
 * 3. 화면별 메시지가 필요하면 훅에 options.defaultMsg로 넘긴다.
 * 4. 전역 mutationCache.onError는 두지 않는다 — 개별 onError와 무관하게
 *    항상 실행되어 토스트가 중복되고, 전역에서는 next-intl을 쓸 수 없다.
 *
 * 예외: useJoinWorkspace는 showToast:false + onHandled로 폼 필드 에러를
 * 표시하므로 호출부가 에러 처리를 전담한다.
 */
export function useApiErrorHandler() {
  const t = useTranslations("errors")

  return (error: customAxiosError, options?: ErrorHandlerOptions) => {
    const showToast = options?.showToast ?? true
    // 기본 폴백은 로케일별 generic. API의 raw message(하드코딩 한국어)는 사용자에게 노출하지 않는다.
    const defaultMsg = options?.defaultMsg ?? t("requestFailed")

    const errorCode = error.response?.data?.code

    // 매핑된 코드만 로케일별 구체 메시지, 그 외(미매핑/무코드)는 generic으로 폴백한다.
    const message =
      errorCode && t.has(errorCode) ? t(errorCode) : defaultMsg

    if (showToast) {
      toast.error(message, { position: "top-center" })
    }
    options?.onHandled?.(message, errorCode)
  }
}
