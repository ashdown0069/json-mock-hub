export interface DashboardStats {
  totalRoutes: number
  requestVolume24h: number
}

export interface RequestLogItem {
  id: string
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  path: string
  status: number
  ip: string | null
  createdAt: string
}

export interface RequestLogsMeta {
  page: number
  limit: number
  totalItems: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface RequestLogsResponse {
  data: RequestLogItem[]
  meta: RequestLogsMeta
}
