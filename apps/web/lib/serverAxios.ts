import "server-only"
import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
} from "axios"
import { cookies } from "next/headers"
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/const/cookies"
import { parseSetCookieValue } from "@/lib/setCookieParser"

export const serverAxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL,
})

/**
 * 401 재시도 요청에 갱신된 쿠키를 실어 나르기 위한 확장 config.
 * axios는 재시도 시 request 인터셉터를 다시 실행하므로, 표식이 없으면
 * 인터셉터가 저장소의 만료된 토큰으로 무조건 덮어써 재시도가 항상 실패했다.
 */
type RetryConfig = InternalAxiosRequestConfig & {
  _retry?: boolean
  _refreshedCookie?: string
}

/** 상태 변경 요청에 API의 CsrfHeaderGuard가 요구하는 커스텀 헤더를 붙인다 */
const attachCsrfHeader = (config: InternalAxiosRequestConfig) => {
  if (["post", "put", "patch", "delete"].includes((config.method ?? "get").toLowerCase())) {
    config.headers["X-Requested-With"] = "XMLHttpRequest"
  }
}

serverAxiosInstance.interceptors.request.use(async (config) => {
  // 401 재시도로 들어온 요청은 이미 갱신된 쿠키를 갖고 있으므로 덮어쓰지 않는다
  const refreshed = (config as RetryConfig)._refreshedCookie
  if (refreshed) {
    config.headers.Cookie = refreshed
    attachCsrfHeader(config)
    return config
  }

  const cookieStore = await cookies()
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value

  const parts: string[] = []
  if (accessToken) parts.push(`${ACCESS_TOKEN_COOKIE}=${accessToken}`)
  if (refreshToken) parts.push(`${REFRESH_TOKEN_COOKIE}=${refreshToken}`)

  if (parts.length > 0) {
    config.headers.Cookie = parts.join("; ")
  }

  attachCsrfHeader(config)
  return config
})

// 서버 컴포넌트 렌더 중에는 브라우저 쿠키를 갱신할 수 없으므로
// 갱신된 토큰은 인메모리로만 사용하여 원래 요청을 재시도한다
serverAxiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryConfig

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true

      const cookieStore = await cookies()
      const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value

      if (!refreshToken) {
        return Promise.reject(error)
      }

      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
        // 인터셉터 무한 루프를 방지하기 위해 native fetch로 갱신 요청
        const refreshRes = await fetch(`${backendUrl}/auth/refresh`, {
          method: "POST",
          headers: {
            Cookie: `${REFRESH_TOKEN_COOKIE}=${refreshToken}`,
            "X-Requested-With": "XMLHttpRequest",
          },
          cache: "no-store",
        })

        if (!refreshRes.ok) {
          return Promise.reject(error)
        }

        const newAccessToken = parseSetCookieValue(
          refreshRes.headers.getSetCookie(),
          ACCESS_TOKEN_COOKIE
        )

        if (!newAccessToken) {
          return Promise.reject(error)
        }

        // 갱신된 토큰을 config에 표식으로 남겨 request 인터셉터가 덮어쓰지 않게 한다
        originalRequest._refreshedCookie = `${ACCESS_TOKEN_COOKIE}=${newAccessToken}; ${REFRESH_TOKEN_COOKIE}=${refreshToken}`
        originalRequest.headers.Cookie = originalRequest._refreshedCookie

        return serverAxiosInstance(originalRequest)
      } catch {
        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  }
)
