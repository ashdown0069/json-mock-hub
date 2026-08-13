jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}))

import { folderChildrenAccessor } from "../FileTree"
import type { FileTree } from "../../types"

const folder = (over: Partial<FileTree> = {}): FileTree => ({
  id: "1",
  name: "shop",
  itemType: "Folder",
  ...over,
})

const file = (over: Partial<FileTree> = {}): FileTree => ({
  id: "2",
  name: "users",
  itemType: "File",
  ...over,
})

describe("folderChildrenAccessor", () => {
  it("빈 폴더에도 배열을 돌려준다 (react-arborist가 leaf로 오판하지 않도록)", () => {
    expect(folderChildrenAccessor(folder())).toEqual([])
  })

  it("자식이 있는 폴더는 자식 배열을 그대로 돌려준다", () => {
    const children = [file()]
    expect(folderChildrenAccessor(folder({ children }))).toBe(children)
  })

  it("파일에는 null을 돌려준다 (leaf로 판별되어야 함)", () => {
    expect(folderChildrenAccessor(file())).toBeNull()
  })

  it("children이 잘못 붙은 파일이라도 leaf로 취급한다", () => {
    expect(folderChildrenAccessor(file({ children: [] }))).toBeNull()
  })
})
