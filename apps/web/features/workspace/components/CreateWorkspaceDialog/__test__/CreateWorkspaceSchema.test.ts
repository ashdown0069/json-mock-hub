import { getCreateWorkspaceSchema } from "../CreateWorkspaceSchema"

describe("getCreateWorkspaceSchema", () => {
  const mockT = (key: string) => key
  const schema = getCreateWorkspaceSchema(mockT)

  it("이름이 세 글자 미만인 경우 error.name.min 에러가 발생해야 한다", () => {
    const result = schema.safeParse({
      name: "ab",
    })
    expect(result.success).toBe(false)
    if (result.success) return

    const nameError = result.error.errors.find((err) => err.path.includes("name"))
    expect(nameError).toBeDefined()
    expect(nameError?.message).toBe("error.name.min")
  })

  it("비밀번호가 없으면 검증에 실패해야 한다 (API가 필수로 요구한다)", () => {
    const result = schema.safeParse({
      name: "workspace-name",
    })
    expect(result.success).toBe(false)
    if (result.success) return

    const passwordError = result.error.errors.find((err) =>
      err.path.includes("password")
    )
    expect(passwordError).toBeDefined()
  })

  it("비밀번호가 4자 미만이면 검증에 실패해야 한다", () => {
    const result = schema.safeParse({
      name: "workspace-name",
      password: "abc",
      passwordConfirm: "abc",
    })
    expect(result.success).toBe(false)
    if (result.success) return

    const minError = result.error.errors.find(
      (err) => err.path.join(".") === "password"
    )
    expect(minError?.message).toBe("error.password.min")
  })

  it("비밀번호는 입력했으나 비밀번호 확인을 입력하지 않은 경우 검증에 실패해야 한다", () => {
    const result = schema.safeParse({
      name: "workspace-name",
      password: "password123",
    })
    expect(result.success).toBe(false)
    if (result.success) return

    const passwordError = result.error.errors.find((err) =>
      err.path.includes("passwordConfirm")
    )
    expect(passwordError).toBeDefined()
    expect(passwordError?.message).toBe("error.password.notMatch")
  })

  it("비밀번호와 비밀번호 확인이 일치하지 않는 경우 passwordConfirm 경로에 error.password.notMatch 에러가 발생해야 한다", () => {
    const result = schema.safeParse({
      name: "workspace-name",
      password: "password123",
      passwordConfirm: "different",
    })
    expect(result.success).toBe(false)
    if (result.success) return

    const mismatchError = result.error.errors.find((err) =>
      err.path.join(".") === "passwordConfirm"
    )
    expect(mismatchError).toBeDefined()
    expect(mismatchError?.message).toBe("error.password.notMatch")
  })

  it("비밀번호와 비밀번호 확인이 일치하는 경우 검증에 성공해야 한다", () => {
    const result = schema.safeParse({
      name: "workspace-name",
      password: "password123",
      passwordConfirm: "password123",
    })
    expect(result.success).toBe(true)
  })
})
