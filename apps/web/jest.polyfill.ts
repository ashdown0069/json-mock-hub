if (typeof globalThis.Request === "undefined") {
  class PolyfillRequest {
    url: string
    constructor(input: string | URL) {
      this.url = typeof input === "string" ? input : input.toString()
    }
  }
  ;(globalThis as unknown as { Request: unknown }).Request = PolyfillRequest
}

if (typeof globalThis.Response === "undefined") {
  class PolyfillResponse {
    status: number
    headers: Headers
    constructor(body?: unknown, init?: ResponseInit) {
      this.status = init?.status ?? 200
      this.headers = new Headers(init?.headers)
    }
  }
  ;(globalThis as unknown as { Response: unknown }).Response = PolyfillResponse
}
