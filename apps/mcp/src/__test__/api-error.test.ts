import { ApiError, parseErrorBody } from "../api-error"

describe("api-error", () => {
  describe("ApiError", () => {
    it("상태코드, 코드, 메시지를 올바르게 보관한다", () => {
      const err = new ApiError(400, "duplicate", "File already exists")
      expect(err.status).toBe(400)
      expect(err.code).toBe("duplicate")
      expect(err.message).toBe("File already exists")
      expect(err.name).toBe("ApiError")
    })
  })

  describe("parseErrorBody", () => {
    it("body가 null이면 HTTP 상태코드를 반환한다", () => {
      expect(parseErrorBody(404, null)).toEqual({
        code: null,
        message: "HTTP 404",
      })
    })

    it("ValidationPipe의 배열 메시지를 ' / '로 join하여 반환한다", () => {
      const res = parseErrorBody(400, {
        message: ["이름은 필수입니다", "잘못된 형식입니다"],
      })
      expect(res.message).toBe("이름은 필수입니다 / 잘못된 형식입니다")
    })

    it("중복 에러 key를 code로 추출한다", () => {
      const res = parseErrorBody(400, {
        key: "duplicate",
        message: "File name already exists",
      })
      expect(res.code).toBe("duplicate")
      expect(res.message).toBe("File name already exists")
    })

    it("전역 필터 형식 { code, message }를 정상 파싱한다", () => {
      const res = parseErrorBody(403, {
        code: "workspace.permission.denied",
        message: "권한이 없습니다",
      })
      expect(res.code).toBe("workspace.permission.denied")
      expect(res.message).toBe("권한이 없습니다")
    })

    it("중첩된 { message: { code, message } } 형식도 안전하게 폴백 파싱한다", () => {
      const res = parseErrorBody(400, {
        message: { code: "custom.error", message: "중첩된 에러" },
      })
      expect(res.code).toBe("custom.error")
      expect(res.message).toBe("중첩된 에러")
    })

    it("메시지가 500자를 초과하면 500자까지만 자른다", () => {
      const longMessage = "a".repeat(600)
      const res = parseErrorBody(500, { message: longMessage })
      expect(res.message.length).toBe(500)
    })
  })
})
