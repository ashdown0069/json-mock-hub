import { useFileBrowser } from "../useFileBrowser"

describe("useFileBrowser", () => {
  beforeEach(() => {
    useFileBrowser.setState({
      activeItem: "",
    })
  })

  it("setActiveItem은 activeItem을 갱신한다", () => {
    useFileBrowser.getState().setActiveItem("item-1")
    expect(useFileBrowser.getState().activeItem).toBe("item-1")
  })

  it("setActiveItem은 동일한 값을 할당할 때 전체 스토어 상태 객체 참조를 유지한다 (Zustand bailout)", () => {
    useFileBrowser.getState().setActiveItem("item-1")
    const initialState = useFileBrowser.getState()
    useFileBrowser.getState().setActiveItem("item-1")
    expect(useFileBrowser.getState()).toBe(initialState)
  })
})
