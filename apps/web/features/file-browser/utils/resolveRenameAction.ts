import { FileItem } from "../types"

export type RenameAction =
  | {
      kind: "create"
      payload: {
        name: string
        itemType: FileItem["itemType"]
        parentId: string | null
      }
    }
  | { kind: "rename"; payload: { itemId: string; newName: string } }
  | { kind: "ignore" }

// temp- 접두사 노드는 "임시 노드 확정 = 생성", 그 외는 "이름 변경"으로 해석한다
export function resolveRenameAction(
  id: string,
  name: string,
  tempNode: FileItem | null
): RenameAction {
  if (id.startsWith("temp-")) {
    if (tempNode && tempNode.id === id) {
      return {
        kind: "create",
        payload: {
          name,
          itemType: tempNode.itemType,
          parentId: tempNode.parentId || null,
        },
      }
    }
    return { kind: "ignore" }
  }
  return { kind: "rename", payload: { itemId: id, newName: name } }
}
