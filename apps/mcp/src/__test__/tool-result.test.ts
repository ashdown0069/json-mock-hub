import { ApiError } from "../api-client"
import { formatApiError } from "../tool-result"

const textOf = (result: { content: { text: string }[] }) =>
  result.content[0]?.text ?? ""

describe("formatApiError", () => {
  it("중복 이름(code: duplicate)에 다른 이름을 시도하라는 힌트를 붙인다", () => {
    const result = formatApiError(
      new ApiError(400, "duplicate", "File name already exists")
    )

    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain("다른 이름")
  })

  it("영어 메시지에도 힌트가 뜬다 (이전에는 message.includes(\"이름\")이라 안 떴다)", () => {
    const result = formatApiError(
      new ApiError(400, "duplicate", "Folder name already exists")
    )

    expect(textOf(result)).toContain("힌트")
  })

  it("검증 실패에는 형식을 다시 확인하라는 힌트를 붙인다", () => {
    const result = formatApiError(
      new ApiError(400, "common.validation_failed", "이름은 한글만 가능합니다.")
    )

    expect(textOf(result)).toContain("힌트")
  })

  it("잘못된 식별자에는 list_mock_apis 안내를 붙인다", () => {
    const result = formatApiError(
      new ApiError(400, "common.invalid_id", "잘못된 형식의 식별자입니다.")
    )

    expect(textOf(result)).toContain("list_mock_apis")
  })

  it("이동 시 이름 충돌(code: nameConflict)에 대상 폴더를 바꾸라는 힌트를 붙인다", () => {
    const result = formatApiError(
      new ApiError(
        400,
        "nameConflict",
        "An item with the same name already exists in the target location"
      )
    )
    expect(textOf(result)).toContain("대상 폴더")
  })

  it("힌트가 없는 코드에는 상태·코드·메시지만 담는다", () => {
    const result = formatApiError(new ApiError(500, null, "서버 오류가 발생했습니다."))

    expect(textOf(result)).toBe("[500] error: 서버 오류가 발생했습니다.")
  })

  it("ApiError가 아닌 예외도 처리한다", () => {
    expect(textOf(formatApiError(new Error("boom")))).toContain("boom")
  })
})
