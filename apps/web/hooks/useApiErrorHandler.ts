import { useTranslations } from "next-intl"
import { toast } from "sonner"
import type { customAxiosError } from "@/lib/axios"

interface ErrorHandlerOptions {
  showToast?: boolean
  defaultMsg?: string
  onHandled?: (message: string, code?: string) => void
}

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
