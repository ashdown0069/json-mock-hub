jest.mock("@shikijs/themes/github-light", () => ({}), { virtual: true })
jest.mock("@shikijs/langs/json", () => ({}), { virtual: true })
jest.mock("@shikijs/langs/javascript", () => ({}), { virtual: true })
jest.mock("@shikijs/langs/typescript", () => ({}), { virtual: true })
jest.mock("@shikijs/langs/shellscript", () => ({}), { virtual: true })

const createHighlighterCore = jest.fn()

jest.mock("shiki/core", () => ({
  createHighlighterCore: (...args: unknown[]) => createHighlighterCore(...args),
}))
jest.mock("shiki/engine/javascript", () => ({
  createJavaScriptRegexEngine: () => ({}),
}))

describe("getHighlighter", () => {
  beforeEach(() => {
    jest.resetModules()
    createHighlighterCore.mockReset()
  })

  const load = async () => (await import("../shiki")).getHighlighter

  it("성공한 인스턴스는 싱글턴으로 재사용한다", async () => {
    createHighlighterCore.mockResolvedValue({ id: "hl" })
    const getHighlighter = await load()

    const first = await getHighlighter()
    const second = await getHighlighter()

    expect(first).toBe(second)
    expect(createHighlighterCore).toHaveBeenCalledTimes(1)
  })

  it("초기화 실패 시 캐시를 비워 다음 호출에서 재시도한다", async () => {
    createHighlighterCore
      .mockRejectedValueOnce(new Error("wasm load failed"))
      .mockResolvedValueOnce({ id: "hl" })
    const getHighlighter = await load()

    await expect(getHighlighter()).rejects.toThrow("wasm load failed")

    // 실패한 promise가 캐시에 남으면 이 호출도 같은 에러로 reject된다
    await expect(getHighlighter()).resolves.toEqual({ id: "hl" })
    expect(createHighlighterCore).toHaveBeenCalledTimes(2)
  })

  it("연속 실패해도 매번 재시도한다", async () => {
    createHighlighterCore.mockRejectedValue(new Error("boom"))
    const getHighlighter = await load()

    await expect(getHighlighter()).rejects.toThrow("boom")
    await expect(getHighlighter()).rejects.toThrow("boom")

    expect(createHighlighterCore).toHaveBeenCalledTimes(2)
  })
})
