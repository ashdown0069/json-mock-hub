import { getSignupSchema } from "../signupSchema"

describe("getSignupSchema", () => {
  const t = (key: string) => key
  const schema = getSignupSchema(t)

  it("올바른 입력값인 경우 검증에 성공해야 한다", () => {
    const validInput = {
      email: "user@test.com",
      nickname: "tester",
      password: "123456",
      confirmPassword: "123456",
    }
    const result = schema.safeParse(validInput)
    expect(result.success).toBe(true)
  })

  it("유효하지 않은 이메일 형식인 경우 error.invalidEmail 메시지와 함께 실패해야 한다", () => {
    const invalidInput = {
      email: "invalid-email",
      nickname: "tester",
      password: "123456",
      confirmPassword: "123456",
    }
    const result = schema.safeParse(invalidInput)
    expect(result.success).toBe(false)
    if (result.success) return

    const emailError = result.error.errors.find((err) => err.path.includes("email"))
    expect(emailError).toBeDefined()
    expect(emailError?.message).toBe("error.invalidEmail")
  })

  it("이메일이 빈 문자열인 경우 error.invalidEmail 메시지와 함께 실패해야 한다", () => {
    const invalidInput = {
      email: "",
      nickname: "tester",
      password: "123456",
      confirmPassword: "123456",
    }
    const result = schema.safeParse(invalidInput)
    expect(result.success).toBe(false)
    if (result.success) return

    const emailError = result.error.errors.find((err) => err.path.includes("email"))
    expect(emailError).toBeDefined()
    expect(emailError?.message).toBe("error.invalidEmail")
  })

  it("닉네임이 빈 문자열인 경우 error.nicknameRequired 메시지와 함께 실패해야 한다", () => {
    const invalidInput = {
      email: "user@test.com",
      nickname: "",
      password: "123456",
      confirmPassword: "123456",
    }
    const result = schema.safeParse(invalidInput)
    expect(result.success).toBe(false)
    if (result.success) return

    const nicknameErrors = result.error.errors.filter((err) => err.path.includes("nickname"))
    const messages = nicknameErrors.map((err) => err.message)
    expect(messages).toContain("error.nicknameRequired")
  })

  it("닉네임이 1글자인 경우 error.nicknameMin 메시지와 함께 실패해야 한다", () => {
    const invalidInput = {
      email: "user@test.com",
      nickname: "a",
      password: "123456",
      confirmPassword: "123456",
    }
    const result = schema.safeParse(invalidInput)
    expect(result.success).toBe(false)
    if (result.success) return

    const nicknameErrors = result.error.errors.filter((err) => err.path.includes("nickname"))
    const messages = nicknameErrors.map((err) => err.message)
    expect(messages).toContain("error.nicknameMin")
    expect(messages).not.toContain("error.nicknameRequired")
  })

  it("비밀번호가 6자 미만인 경우 error.passwordMin 메시지와 함께 실패해야 한다", () => {
    const invalidInput = {
      email: "user@test.com",
      nickname: "tester",
      password: "12345",
      confirmPassword: "12345",
    }
    const result = schema.safeParse(invalidInput)
    expect(result.success).toBe(false)
    if (result.success) return

    const passwordError = result.error.errors.find((err) => err.path.includes("password"))
    expect(passwordError).toBeDefined()
    expect(passwordError?.message).toBe("error.passwordMin")
  })

  it("비밀번호가 빈 문자열인 경우 error.passwordMin 메시지와 함께 실패해야 한다", () => {
    const invalidInput = {
      email: "user@test.com",
      nickname: "tester",
      password: "",
      confirmPassword: "",
    }
    const result = schema.safeParse(invalidInput)
    expect(result.success).toBe(false)
    if (result.success) return

    const passwordError = result.error.errors.find((err) => err.path.includes("password"))
    expect(passwordError).toBeDefined()
    expect(passwordError?.message).toBe("error.passwordMin")
  })

  it("비밀번호와 비밀번호 확인이 일치하지 않는 경우 confirmPassword 경로에 error.passwordNotMatch 메시지와 함께 실패해야 한다", () => {
    const invalidInput = {
      email: "user@test.com",
      nickname: "tester",
      password: "123456",
      confirmPassword: "654321",
    }
    const result = schema.safeParse(invalidInput)
    expect(result.success).toBe(false)
    if (result.success) return

    const mismatchError = result.error.errors.find((err) => err.path.join(".") === "confirmPassword")
    expect(mismatchError).toBeDefined()
    expect(mismatchError?.message).toBe("error.passwordNotMatch")
  })
})
