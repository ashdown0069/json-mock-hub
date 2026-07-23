import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from "axios"

// 1. 기본 API 요청용 인스턴스 (401 에러 가로채기 인터셉터 적용)
export const axiosInstance: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL,
  withCredentials: true,
})

// 2. 토큰 갱신 등 인터셉터 적용을 배제해야 하는 인증 전용 인스턴스
const authAxios: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL,
  withCredentials: true,
})

// 3. 동시 요청(경쟁 상태) 제어를 위한 변수 및 대기열 선언
let isRefreshing = false
let failedQueue: Array<{
  resolve: (value?: unknown) => void
  reject: (reason?: unknown) => void
}> = []

// 대기열 내 모든 요청 처리 헬퍼 함수
const processQueue = (error: AxiosError | null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve()
    }
  })
  failedQueue = []
}

// 4. Response Interceptor 설정
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean
    }

    // 401 에러가 발생했고, 아직 재시도하지 않은 요청인 경우
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true

      // 이미 다른 요청이 토큰을 갱신 중인 경우 대기열에 추가
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then(() => axiosInstance(originalRequest))
          .catch((err) => Promise.reject(err))
      }

      isRefreshing = true

      try {
        // 인터셉터가 없는 순수 인스턴스(authAxios)로 토큰 갱신 요청을 보냅니다.
        // 이로써 갱신 요청의 401 에러가 이 인터셉터로 들어오는 것을 원천 차단합니다.
        await authAxios.post("/auth/refresh")

        // 대기열의 요청들 재실행 허용
        processQueue(null)

        // 현재 실패했던 원래 요청 재시도
        return axiosInstance(originalRequest)
      } catch (refreshError) {
        // 토큰 갱신에 실패한 경우 (리프레시 토큰 만료 등)
        processQueue(refreshError as AxiosError)

        // 브라우저 환경에서 메인 로그인 화면(/)으로 이동
        if (typeof window !== "undefined") {
          window.location.href = "/"
        }
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

// SSE 등 axios 인터셉터 밖에서 토큰 갱신이 필요할 때 사용
export const refreshAccessToken = () => authAxios.post("/auth/refresh")

export type customAxiosError = AxiosError<{
  message?: string
  code?: string
}>

export default axiosInstance
