import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from "axios"
import createAuthRefresh from "axios-auth-refresh"

export const axiosInstance: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL,
  withCredentials: true,
})

// API의 CsrfHeaderGuard가 요구하는 커스텀 헤더
const CSRF_METHODS = new Set(["post", "put", "patch", "delete"])

const attachCsrfHeader = (config: InternalAxiosRequestConfig) => {
  if (CSRF_METHODS.has((config.method ?? "get").toLowerCase())) {
    config.headers["X-Requested-With"] = "XMLHttpRequest"
  }
  return config
}

axiosInstance.interceptors.request.use(attachCsrfHeader)

// axiosInstance의 401 인터셉터가 갱신 요청에도 개입하면 무한 루프가 되므로
// 인터셉터가 없는 별도 인스턴스로 인증 요청을 보낸다
export const authAxios: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL,
  withCredentials: true,
})
authAxios.interceptors.request.use(attachCsrfHeader)

/**
 * 401 발생 시 axios-auth-refresh가 호출하는 갱신 로직.
 * 동시에 여러 요청이 401을 받아도 axios-auth-refresh가 큐를 관리하므로 1회만 실행된다.
 */
const refreshAuthLogic = async () => {
  try {
    await authAxios.post("/auth/refresh")
  } catch (error) {
    if (typeof window !== "undefined") {
      window.location.href = "/"
    }
    return Promise.reject(error)
  }
}

createAuthRefresh(axiosInstance, refreshAuthLogic, {
  statusCodes: [401],
  deduplicateRefresh: false,
})

/**
 * SSE 등 axios 인터셉터를 거치지 않는 통신에서 수동으로 토큰을 갱신할 때 쓰는 헬퍼
 */
export const refreshAccessToken = async (): Promise<boolean> => {
  try {
    await authAxios.post("/auth/refresh")
    return true
  } catch {
    return false
  }
}


export type customAxiosError = AxiosError<{ code?: string }>

export const customAxiosError = (error: unknown): error is customAxiosError => {
  return axios.isAxiosError(error)
}

export default axiosInstance
