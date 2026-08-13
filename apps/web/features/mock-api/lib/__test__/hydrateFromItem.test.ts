import { buildHydrationState } from "../hydrateFromItem"
import type { FileItem } from "@/features/file-browser/types"

const baseItem = {
  id: "1",
  name: "users",
  itemType: "File",
  schema: { name: "string" },
} as FileItem

describe("buildHydrationState — 파라미터명 기본값", () => {
  it("옵션이 없으면 공유 기본값으로 폼을 채운다", () => {
    const state = buildHydrationState(baseItem)

    // 폼은 기능이 꺼져 있어도 입력 칸을 보여주므로 이름이 비면 안 된다
    expect(state.pageParam).toBe("page")
    expect(state.limitParam).toBe("limit")
    expect(state.sortParam).toBe("_sort")
    expect(state.orderParam).toBe("_order")
    expect(state.searchParam).toBe("q")
    expect(state.enablePagination).toBe(false)
  })

  it("저장된 파라미터명을 복원한다", () => {
    const state = buildHydrationState({
      ...baseItem,
      options: {
        pagination: true,
        paginationParams: { pageParam: "p", limitParam: "size" },
        sort: true,
        sortParams: { sortParam: "orderBy", orderParam: "dir" },
        search: true,
        searchParams: { searchParam: "keyword" },
      },
    } as FileItem)

    expect(state.pageParam).toBe("p")
    expect(state.sortParam).toBe("orderBy")
    expect(state.searchParam).toBe("keyword")
    expect(state.enableSearch).toBe(true)
  })
})
