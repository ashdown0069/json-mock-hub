import { withApiErrors } from "../tool-errors"
import { toolText, formatApiError } from "../tool-result"
import { AmbiguousPathError } from "../resolvePath"
import { ApiError } from "../api-client"

describe("withApiErrors", () => {
  it("성공하면 결과를 그대로 통과시킨다", async () => {
    const result = await withApiErrors(async () => toolText("ok"))

    expect(result.isError).toBeFalsy()
    expect((result.content[0] as any).text).toBe("ok")
  })

  it("예외를 tool error로 변환한다", async () => {
    const result = await withApiErrors(async () => {
      throw new Error("network down")
    })

    // 던지면 MCP 프로토콜 에러가 되어 LLM이 자가 수정할 수 없다
    expect(result.isError).toBe(true)
  })

  it("동기 throw도 잡는다", async () => {
    const result = await withApiErrors(() => {
      throw new Error("boom")
    })

    expect(result.isError).toBe(true)
  })
})

describe("경로 모호성 오류 변환", () => {
  const textOf = (result: { content: { text: string }[] }) =>
    result.content[0]?.text ?? ""

  it("withApiErrors가 AmbiguousPathError를 자가 수정 가능한 tool error로 바꾼다", async () => {
    const result = await withApiErrors(() => {
      throw new AmbiguousPathError("/products", ["/products", "/Products"])
    })

    expect(result.isError).toBe(true)
    const text = textOf(result)
    expect(text).toContain("/Products")
    expect(text).toContain("대소문자")
    // "알 수 없는 오류"로 뭉개지면 LLM이 무엇을 고쳐야 할지 알 수 없다
    expect(text).not.toContain("알 수 없는 오류")
  })

  it("formatApiError를 직접 호출해도 같은 결과다", () => {
    const result = formatApiError(new AmbiguousPathError("/a", ["/a", "/A"]))

    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain("/A")
  })
})

describe("API 에러 힌트", () => {
  const textOf = (result: { content: { text: string }[] }) =>
    result.content[0]?.text ?? ""

  // 스로틀러 예외는 code를 싣지 않는다. 힌트가 없으면 LLM이 즉시 재시도해
  // 1시간 차단을 계속 연장한다.
  it("429는 code가 없어도 재시도 금지 힌트를 붙인다", () => {
    const text = textOf(
      formatApiError(
        new ApiError(429, null, "ThrottlerException: Too Many Requests")
      )
    )

    expect(text).toContain("힌트")
    expect(text).toContain("재시도")
  })

  // 키 검증 쿼리가 workspace 조건을 함께 걸어, 키가 맞아도 워크스페이스 ID가
  // 다르면 같은 코드가 나온다. 키만 지목하면 엉뚱한 값을 고치게 된다.
  it("auth.api_key.invalid 힌트는 WORKSPACE_ID도 함께 지목한다", () => {
    const text = textOf(
      formatApiError(new ApiError(401, "auth.api_key.invalid", "invalid api key"))
    )

    expect(text).toContain("MOCK_HUB_WORKSPACE_ID")
    expect(text).toContain("MOCK_HUB_API_KEY")
  })

  it("invalidParent는 폴더를 만드는 다음 행동을 안내한다", () => {
    const text = textOf(
      formatApiError(new ApiError(400, "invalidParent", "invalid parent"))
    )

    expect(text).toContain("create_folder")
  })

  it("workspace.access.not_member 힌트를 제공한다", () => {
    const text = textOf(
      formatApiError(new ApiError(403, "workspace.access.not_member", "not a member"))
    )

    expect(text).toContain("멤버")
  })

  it("auth.api_key.workspace_mismatch 힌트를 제공한다", () => {
    const text = textOf(
      formatApiError(
        new ApiError(403, "auth.api_key.workspace_mismatch", "mismatch")
      )
    )

    expect(text).toContain("워크스페이스")
  })
})
