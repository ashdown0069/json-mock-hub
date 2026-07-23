import "server-only"
import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
} from "axios"
import { cookies } from "next/headers"
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/const/cookies"
import { parseSetCookieValue } from "@/lib/setCookieParser"

// ── 1. 인스턴스 생성 (모듈 레벨 싱글턴) ──────────────────────────
export const serverAxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL,
})

// ── 2. Request Interceptor: 매 요청 시 next/headers cookies()에서 쿠키 주입 ──
serverAxiosInstance.interceptors.request.use(async (config) => {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value

  const parts: string[] = []
  if (accessToken) parts.push(`${ACCESS_TOKEN_COOKIE}=${accessToken}`)
  if (refreshToken) parts.push(`${REFRESH_TOKEN_COOKIE}=${refreshToken}`)

  if (parts.length > 0) {
    config.headers.Cookie = parts.join("; ")
  }

  return config
})

// ── 3. Response Interceptor: 401 시 refresh 1회 재시도 ──────────────
// 서버 컴포넌트 렌더 중에는 브라우저 쿠키를 갱신할 수 없으므로
// 갱신된 토큰은 인메모리로만 사용하여 원래 요청을 재시도한다.
serverAxiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean
    }

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
          headers: { Cookie: `${REFRESH_TOKEN_COOKIE}=${refreshToken}` },
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

        // 갱신된 토큰으로 원래 요청 헤더를 교체하여 재시도
        originalRequest.headers.Cookie =
          `${ACCESS_TOKEN_COOKIE}=${newAccessToken}; ${REFRESH_TOKEN_COOKIE}=${refreshToken}`

        return serverAxiosInstance(originalRequest)
      } catch {
        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  }
)
