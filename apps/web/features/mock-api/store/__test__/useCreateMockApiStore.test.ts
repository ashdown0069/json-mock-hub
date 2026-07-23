import { useCreateMockApiStore } from "../useCreateMockApiStore"

describe("useCreateMockApiStore", () => {
  beforeEach(() => {
    useCreateMockApiStore.getState().reset()
  })

  it("hydrate 시 지정한 값으로 시딩되며, 지정하지 않은 항목은 초기값으로 설정된다", () => {
    useCreateMockApiStore.getState().hydrate({
      apiPath: "posts",
      fields: [{ id: "f1", name: "title", type: "string" }],
    })

    const state = useCreateMockApiStore.getState()
    expect(state.apiPath).toBe("posts")
    expect(state.fields).toEqual([{ id: "f1", name: "title", type: "string" }])
    
    // 지정하지 않은 itemCount, enablePagination 등은 초기화되어야 함
    expect(state.itemCount).toEqual([10])
    expect(state.enablePagination).toBe(false)
    expect(state.pageParam).toBe("page")
    expect(state.limitParam).toBe("limit")
  })

  it("hydrate 이후 reset을 호출하면 전체 상태가 기본값으로 초기화된다", () => {
    useCreateMockApiStore.getState().hydrate({
      apiPath: "comments",
      enablePagination: true,
      pageParam: "p",
    })

    expect(useCreateMockApiStore.getState().apiPath).toBe("comments")
    expect(useCreateMockApiStore.getState().enablePagination).toBe(true)

    useCreateMockApiStore.getState().reset()

    const state = useCreateMockApiStore.getState()
    expect(state.apiPath).toBe("")
    expect(state.enablePagination).toBe(false)
    expect(state.pageParam).toBe("page")
  })

  describe("필드 조작 (재귀 로직)", () => {
    const seedNestedFields = () => {
      useCreateMockApiStore.getState().hydrate({
        fields: [
          {
            id: "f1",
            name: "user",
            type: "object",
            fields: [
              { id: "f2", name: "name", type: "string" },
              { id: "f3", name: "age", type: "number" },
            ],
          },
          { id: "f4", name: "tags", type: "array" },
        ],
      })
    }

    it("addField는 기본값을 가진 새 필드를 추가한다", () => {
      useCreateMockApiStore.getState().addField()
      const state = useCreateMockApiStore.getState()
      expect(state.fields).toHaveLength(1)
      expect(state.fields[0]).toEqual({
        id: expect.any(String),
        name: "",
        type: "string",
        fakerMethod: "none",
      })
    })

    it("updateField는 최상위 필드의 값을 갱신한다", () => {
      useCreateMockApiStore.getState().hydrate({
        fields: [{ id: "f1", name: "title", type: "string" }],
      })

      useCreateMockApiStore.getState().updateField("f1", "name", "content")
      const state = useCreateMockApiStore.getState()
      expect(state.fields[0]?.name).toBe("content")
    })

    it("updateField는 중첩된 필드도 재귀적으로 찾아 갱신하고 다른 필드는 유지한다", () => {
      useCreateMockApiStore.getState().hydrate({
        fields: [
          {
            id: "f1",
            name: "user",
            type: "object",
            fields: [
              { id: "f2", name: "name", type: "string" },
              { id: "f3", name: "age", type: "number" },
            ],
          },
          { id: "f4", name: "tags", type: "array" },
        ],
      })

      useCreateMockApiStore.getState().updateField("f3", "type", "string")

      const state = useCreateMockApiStore.getState()
      expect(state.fields).toEqual([
        {
          id: "f1",
          name: "user",
          type: "object",
          fields: [
            { id: "f2", name: "name", type: "string" },
            { id: "f3", name: "age", type: "string" },
          ],
        },
        { id: "f4", name: "tags", type: "array" },
      ])
    })

    it("removeField는 최상위 필드를 제거한다", () => {
      useCreateMockApiStore.getState().hydrate({
        fields: [
          { id: "f1", name: "title", type: "string" },
          { id: "f2", name: "content", type: "string" },
        ],
      })
      useCreateMockApiStore.getState().removeField("f1")
      const state = useCreateMockApiStore.getState()
      expect(state.fields).toEqual([
        { id: "f2", name: "content", type: "string" },
      ])
    })

    it("removeField는 중첩된 필드를 재귀적으로 제거한다", () => {
      useCreateMockApiStore.getState().hydrate({
        fields: [
          {
            id: "f1",
            name: "user",
            type: "object",
            fields: [
              { id: "f2", name: "name", type: "string" },
              { id: "f3", name: "age", type: "number" },
            ],
          },
        ],
      })
      useCreateMockApiStore.getState().removeField("f2")
      const state = useCreateMockApiStore.getState()
      expect(state.fields).toEqual([
        {
          id: "f1",
          name: "user",
          type: "object",
          fields: [{ id: "f3", name: "age", type: "number" }],
        },
      ])
    })

    it("addSubfield는 fields가 없던 필드에 배열을 만들어 기본 필드를 추가한다", () => {
      useCreateMockApiStore.getState().hydrate({
        fields: [{ id: "f1", name: "user", type: "object" }],
      })
      useCreateMockApiStore.getState().addSubfield("f1")
      const state = useCreateMockApiStore.getState()
      expect(state.fields[0]?.fields).toHaveLength(1)
      expect(state.fields[0]?.fields?.[0]).toEqual({
        id: expect.any(String),
        name: "",
        type: "string",
        fakerMethod: "none",
      })
    })

    it("addSubfield는 중첩 필드도 재귀적으로 찾아 하위 필드를 추가한다", () => {
      useCreateMockApiStore.getState().hydrate({
        fields: [
          {
            id: "f1",
            name: "user",
            type: "object",
            fields: [{ id: "f2", name: "profile", type: "object" }],
          },
        ],
      })
      useCreateMockApiStore.getState().addSubfield("f2")
      const state = useCreateMockApiStore.getState()
      expect(state.fields[0]?.fields?.[0]?.fields).toHaveLength(1)
      expect(state.fields[0]?.fields?.[0]?.fields?.[0]).toEqual({
        id: expect.any(String),
        name: "",
        type: "string",
        fakerMethod: "none",
      })
    })

    it("addSubfield는 부모 필드에 이미 자식 필드가 존재하는 경우, 기존 필드를 유지하며 추가한다", () => {
      useCreateMockApiStore.getState().hydrate({
        fields: [
          {
            id: "f1",
            name: "user",
            type: "object",
            fields: [{ id: "f2", name: "name", type: "string" }],
          },
        ],
      })
      useCreateMockApiStore.getState().addSubfield("f1")
      const state = useCreateMockApiStore.getState()
      expect(state.fields[0]?.fields).toHaveLength(2)
      expect(state.fields[0]?.fields?.[0]?.id).toBe("f2")
      expect(state.fields[0]?.fields?.[1]).toEqual({
        id: expect.any(String),
        name: "",
        type: "string",
        fakerMethod: "none",
      })
    })

    it("존재하지 않는 ID에 대한 updateField, removeField, addSubfield는 스토어 상태를 변경하지 않는다", () => {
      seedNestedFields()
      const originalFields = JSON.parse(JSON.stringify(useCreateMockApiStore.getState().fields))
      
      useCreateMockApiStore.getState().updateField("no-such-id", "name", "new-name")
      useCreateMockApiStore.getState().removeField("no-such-id")
      useCreateMockApiStore.getState().addSubfield("no-such-id")
      
      expect(useCreateMockApiStore.getState().fields).toEqual(originalFields)
    })

    it("setter들은 각 상태를 갱신한다", () => {
      const store = useCreateMockApiStore.getState()

      store.setApiPath("/api/v1/posts")
      store.setItemCount([5, 10])
      store.setEnablePagination(true)
      store.setPageParam("pageIndex")
      store.setLimitParam("pageSize")

      const state = useCreateMockApiStore.getState()
      expect(state.apiPath).toBe("/api/v1/posts")
      expect(state.itemCount).toEqual([5, 10])
      expect(state.enablePagination).toBe(true)
      expect(state.pageParam).toBe("pageIndex")
      expect(state.limitParam).toBe("pageSize")
    })
  })
})
