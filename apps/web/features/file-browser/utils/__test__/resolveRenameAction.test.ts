import { resolveRenameAction } from "../resolveRenameAction"
import { FileItem } from "../../types"

describe("resolveRenameAction — 트리 rename 이벤트 해석 규칙", () => {
  const tempNode: FileItem = {
    id: "temp-1",
    name: "",
    itemType: "Folder",
    parentId: "p1",
  }

  it("temp- 노드이고 tempNode와 id가 일치하면 create 액션을 반환한다", () => {
    expect(resolveRenameAction("temp-1", "새폴더", tempNode)).toEqual({
      kind: "create",
      payload: { name: "새폴더", itemType: "Folder", parentId: "p1" },
    })
  })

  it("temp- 노드지만 일치하는 tempNode가 없으면 ignore를 반환한다", () => {
    expect(resolveRenameAction("temp-9", "x", null)).toEqual({ kind: "ignore" })
  })

  it("일반 노드면 rename 액션을 반환한다", () => {
    expect(resolveRenameAction("abc", "새이름", tempNode)).toEqual({
      kind: "rename",
      payload: { itemId: "abc", newName: "새이름" },
    })
  })

  it("parentId가 없는 tempNode는 parentId null로 생성한다", () => {
    const rootTemp: FileItem = { id: "temp-2", name: "", itemType: "Folder" }
    expect(resolveRenameAction("temp-2", "루트폴더", rootTemp)).toEqual({
      kind: "create",
      payload: { name: "루트폴더", itemType: "Folder", parentId: null },
    })
  })
})
