import { buildTreeText } from "../tree"
import type { FileBrowserItemRes } from "../api-client"

const item = (over: Partial<FileBrowserItemRes>): FileBrowserItemRes => ({
  id: "id", name: "n", itemType: "File", parentId: null, options: null,
  json: null, schema: null, fieldDefs: null, path: "/n", depth: 0, workspace: "w",
  ...over,
})

describe("buildTreeText", () => {
  it("루트 라인과 경로 사용 안내를 포함한다", () => {
    const text = buildTreeText([item({ id: "1", name: "test", path: "/test" })])
    expect(text).toContain("📁 /")
    expect(text).toContain("괄호 안의 경로")
  })

  it("파일과 폴더에 다른 아이콘을 붙인다", () => {
    const text = buildTreeText([
      item({ id: "1", name: "test", itemType: "File" }),
      item({ id: "2", name: "testfolder", itemType: "Folder" }),
    ])
    expect(text).toContain("📄 test")
    expect(text).toContain("📁 testfolder")
  })

  it("같은 부모 안에서 폴더를 파일보다 먼저, 각각 이름순으로 정렬한다", () => {
    const text = buildTreeText([
      item({ id: "1", name: "zebra-file", itemType: "File" }),
      item({ id: "2", name: "b-folder", itemType: "Folder" }),
      item({ id: "3", name: "a-folder", itemType: "Folder" }),
    ])
    const lines = text.split("\n").filter((l) => l.includes("─"))
    expect(lines[0]).toContain("a-folder")
    expect(lines[1]).toContain("b-folder")
    expect(lines[2]).toContain("zebra-file")
  })

  it("하위 항목을 부모보다 한 단계 더 들여쓴다", () => {
    const text = buildTreeText([
      item({ id: "1", name: "testfolder", itemType: "Folder", parentId: null, path: "/testfolder" }),
      item({ id: "2", name: "test2", itemType: "File", parentId: "1", path: "/testfolder/test2" }),
    ])
    const lines = text.split("\n")
    const folderLine = lines.find((l) => l.includes("testfolder"))!
    const fileLine = lines.find((l) => l.includes("test2"))!
    expect(fileLine.indexOf("📄")).toBeGreaterThan(folderLine.indexOf("📁"))
  })

  it("마지막 형제에는 └──, 그 외에는 ├──를 사용한다", () => {
    const text = buildTreeText([
      item({ id: "1", name: "a-folder", itemType: "Folder" }),
      item({ id: "2", name: "b-file", itemType: "File" }),
    ])
    expect(text).toContain("├── 📁 a-folder")
    expect(text).toContain("└── 📄 b-file")
  })

  // 들여쓰기로 경로를 재구성하다 한 단계만 어긋나도 삭제·갱신이 엉뚱한 항목에 간다.
  // 다른 도구가 받는 값과 정확히 같은 문자열이 각 줄에 있어야 한다.
  it("각 항목 줄에 다른 도구의 path 인자로 쓸 실제 경로를 찍는다", () => {
    const text = buildTreeText([
      item({ id: "1", name: "shop", itemType: "Folder", path: "/shop" }),
      item({ id: "2", name: "users", itemType: "File", parentId: "1", path: "/shop/users" }),
    ])

    expect(text).toContain("(/shop)")
    expect(text).toContain("(/shop/users)")
  })

  it("켜져 있는 옵션만 배지로 표시하고 꺼진 것은 표시하지 않는다", () => {
    const text = buildTreeText([
      item({
        id: "1",
        name: "on",
        itemType: "File",
        path: "/on",
        options: {
          pagination: true,
          search: true,
          searchParams: { searchParam: "q" },
        },
      }),
      item({ id: "2", name: "off", itemType: "File", path: "/off", options: null }),
    ])

    const lines = text.split("\n")
    const onLine = lines.find((line) => line.includes("(/on)"))!
    const offLine = lines.find((line) => line.includes("(/off)"))!

    expect(onLine).toContain("[page,search]")
    expect(onLine).not.toContain("sort")
    expect(offLine).not.toContain("[")
  })

  it("폴더에는 옵션 배지를 붙이지 않는다", () => {
    const text = buildTreeText([
      item({ id: "1", name: "shop", itemType: "Folder", path: "/shop" }),
    ])

    expect(text).not.toContain("[")
  })
})
