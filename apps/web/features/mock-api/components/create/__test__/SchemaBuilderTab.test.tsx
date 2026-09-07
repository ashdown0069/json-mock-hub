import { render, screen, fireEvent } from "@testing-library/react"
import { SchemaBuilderTab } from "../SchemaBuilderTab"
import { useCreateMockApiStore } from "../../../store/useCreateMockApiStore"

// jsdom에는 ResizeObserver가 구현되어 있지 않아, 이를 사용하는
// Radix 기반 컴포넌트(Select 등)를 렌더링하려면 최소 폴리필이 필요합니다.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
;(global as any).ResizeObserver = ResizeObserverStub

// useLocale/useTranslations는 NextIntlClientProvider 컨텍스트가 필요하므로 테스트 환경에서 간단히 모킹합니다.
jest.mock("next-intl", () => ({
  useLocale: () => "ko",
  useTranslations: () => (key: string) => {
    if (key === "submitCreate") return "엔드포인트 생성"
    return key
  },
}))

// sonner의 toast는 실제 UI 토스트 없이 호출 여부만 검증할 수 있도록 모킹합니다.
jest.mock("sonner", () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}))

// generateDummyData는 내부적으로 ESM 전용 패키지인 @faker-js/faker를 사용해
// jest(CJS 변환) 환경에서 파싱이 실패하므로, 더미 데이터 생성 로직 자체는
// 이 테스트의 관심사가 아니기에 단순 모킹으로 대체합니다.
jest.mock("@workspace/mockgen/generateData", () => ({
  generateDummyData: jest.fn((fields: any, count: number) =>
    Array.from({ length: count ?? 10 }).map((_, index) => ({
      id: index + 1,
    }))
  ),
  generateSingleObjectData: jest.fn((fields: any[]) => {
    const obj: Record<string, any> = {}
    fields.forEach((f) => {
      obj[f.name] = f.type === "number" ? 1 : "sample"
    })
    return obj
  }),
}))

const setupStore = (
  overrides: Partial<ReturnType<typeof useCreateMockApiStore.getState>> = {}
) => {
  useCreateMockApiStore.getState().reset()
  useCreateMockApiStore.setState({
    apiPath: "users",
    fields: [{ id: "f1", name: "title", type: "string", fakerMethod: "none" }],
    ...overrides,
  })
}

const renderTab = (props: { onCreate?: jest.Mock; onClose?: jest.Mock } = {}) => {
  const onCreate = props.onCreate ?? jest.fn()
  const onClose = props.onClose ?? jest.fn()
  return render(
    <SchemaBuilderTab
      onClose={onClose}
      onCreate={onCreate}
      endpointPrefix="http://ws1.localhost:3000/api/shop/"
    />
  )
}

describe("SchemaBuilderTab 생성 성공/실패 분리", () => {
  beforeEach(() => {
    // 각 테스트 전 스토어를 초기화하고, 유효성 검사를 통과할 apiPath를 미리 세팅합니다.
    setupStore()
  })

  it("Generate Endpoint 클릭 시 onCreate는 호출되지만 onClose는 호출되지 않는다", () => {
    const onCreate = jest.fn()
    const onClose = jest.fn()

    render(
      <SchemaBuilderTab
        onClose={onClose}
        onCreate={onCreate}
        endpointPrefix="http://ws1.localhost:3000/api/shop/"
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "엔드포인트 생성" }))

    // 부모의 mutation(onCreate)은 호출되어야 하지만,
    // 성공 여부를 알 수 없는 시점에 onClose가 동기적으로 호출되어서는 안 됩니다.
    expect(onCreate).toHaveBeenCalledTimes(1)
    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        fieldDefs: [{ id: "f1", name: "title", type: "string", fakerMethod: "none" }],
      })
    )
    expect(onClose).not.toHaveBeenCalled()
  })

  it("이름이 지정된 필드가 없으면 Generate Endpoint 버튼이 비활성화된다", () => {
    setupStore({
      fields: [{ id: "f1", name: "", type: "string", fakerMethod: "none" }],
    })

    const onCreate = jest.fn()
    const onClose = jest.fn()

    render(
      <SchemaBuilderTab
        onClose={onClose}
        onCreate={onCreate}
        endpointPrefix="http://ws1.localhost:3000/api/shop/"
      />
    )

    const button = screen.getByRole("button", { name: "엔드포인트 생성" })
    expect(button).toBeDisabled()
  })
})

describe("id 예약 필드와 정렬·검색 옵션 페이로드", () => {
  it("생성 페이로드의 schema 최상위에 id: number가 포함된다", () => {
    setupStore({
      apiPath: "users",
      fields: [{ id: "f1", name: "title", type: "string", fakerMethod: "none" }],
    })
    const onCreate = jest.fn()
    renderTab({ onCreate })
    fireEvent.click(screen.getByRole("button", { name: /엔드포인트 생성/ }))
    expect(onCreate).toHaveBeenCalledTimes(1)
    const payload = onCreate.mock.calls[0][0]
    expect(payload.schema.id).toBe("number")
    expect(Object.keys(payload.schema)[0]).toBe("id")
  })

  it("생성된 json 각 행에 id가 1부터 순차 부여된다", () => {
    setupStore({
      apiPath: "users",
      itemCount: [3],
      fields: [{ id: "f1", name: "title", type: "string", fakerMethod: "none" }],
    })
    const onCreate = jest.fn()
    renderTab({ onCreate })
    fireEvent.click(screen.getByRole("button", { name: /엔드포인트 생성/ }))
    const payload = onCreate.mock.calls[0][0]
    expect((payload.json as any[]).map((r) => r.id)).toEqual([1, 2, 3])
  })

  it("사용자가 id라는 이름의 필드를 정의하면 제출이 차단된다", () => {
    setupStore({
      apiPath: "users",
      fields: [
        { id: "f1", name: "id", type: "uuid", fakerMethod: "none" },
        { id: "f2", name: "title", type: "string", fakerMethod: "none" },
      ],
    })
    const onCreate = jest.fn()
    renderTab({ onCreate })
    fireEvent.click(screen.getByRole("button", { name: /엔드포인트 생성/ }))
    expect(onCreate).not.toHaveBeenCalled()
  })

  it("정렬·검색 활성화 시 options에 sortParams/searchParams가 담긴다", () => {
    setupStore({
      apiPath: "users",
      fields: [{ id: "f1", name: "title", type: "string", fakerMethod: "none" }],
      enableSort: true,
      sortParam: "orderBy",
      orderParam: "direction",
      enableSearch: true,
      searchParam: "keyword",
    })
    const onCreate = jest.fn()
    renderTab({ onCreate })
    fireEvent.click(screen.getByRole("button", { name: /엔드포인트 생성/ }))
    const payload = onCreate.mock.calls[0][0]
    expect(payload.options).toEqual({
      resourceType: "collection",
      pagination: false,
      sort: true,
      sortParams: { sortParam: "orderBy", orderParam: "direction" },
      search: true,
      searchParams: { searchParam: "keyword" },
    })
  })

  it("단일 객체 모드(resourceType: 'object')에서는 사용자가 정의한 id 필드가 차단되지 않고 1개 객체로 생성된다", () => {
    setupStore({
      apiPath: "settings",
      resourceType: "object",
      fields: [
        { id: "f1", name: "id", type: "string", fakerMethod: "none" },
        { id: "f2", name: "theme", type: "string", fakerMethod: "none" },
      ],
    })
    const onCreate = jest.fn()
    renderTab({ onCreate })
    fireEvent.click(screen.getByRole("button", { name: /엔드포인트 생성/ }))
    expect(onCreate).toHaveBeenCalledTimes(1)
    const payload = onCreate.mock.calls[0][0]
    expect(payload.options).toEqual({
      resourceType: "object",
      pagination: false,
      sort: false,
      search: false,
    })
    expect(Array.isArray(payload.json)).toBe(false)
    expect(typeof payload.json).toBe("object")
    expect(payload.schema).toEqual({
      id: "string",
      theme: "string",
    })
  })

  it("정렬·검색 비활성화 시 options는 sort/search false에 params가 없다", () => {
    setupStore({
      apiPath: "users",
      fields: [{ id: "f1", name: "title", type: "string", fakerMethod: "none" }],
    })
    const onCreate = jest.fn()
    renderTab({ onCreate })
    fireEvent.click(screen.getByRole("button", { name: /엔드포인트 생성/ }))
    const payload = onCreate.mock.calls[0][0]
    expect(payload.options.sort).toBe(false)
    expect(payload.options.search).toBe(false)
    expect(payload.options.sortParams).toBeUndefined()
    expect(payload.options.searchParams).toBeUndefined()
  })
})

describe("필드명 중복 검증", () => {
  it("같은 위치에 이름이 겹치는 필드가 있으면 제출 버튼이 비활성화된다", () => {
    setupStore({
      fields: [
        { id: "f1", name: "email", type: "string", fakerMethod: "none" },
        { id: "f2", name: "email", type: "number", fakerMethod: "none" },
      ],
    })
    renderTab()
    expect(
      screen.getByRole("button", { name: "엔드포인트 생성" })
    ).toBeDisabled()
  })

  it("중첩 object 하위의 중복도 제출을 막는다", () => {
    setupStore({
      fields: [
        {
          id: "u",
          name: "user",
          type: "object",
          fakerMethod: "none",
          fields: [
            { id: "u1", name: "tag", type: "string", fakerMethod: "none" },
            { id: "u2", name: "tag", type: "string", fakerMethod: "none" },
          ],
        },
      ],
    })
    renderTab()
    expect(
      screen.getByRole("button", { name: "엔드포인트 생성" })
    ).toBeDisabled()
  })

  it("서로 다른 부모 아래의 동명 필드는 제출을 막지 않는다", () => {
    setupStore({
      fields: [
        {
          id: "u",
          name: "user",
          type: "object",
          fakerMethod: "none",
          fields: [
            { id: "u1", name: "name", type: "string", fakerMethod: "none" },
          ],
        },
        {
          id: "c",
          name: "company",
          type: "object",
          fakerMethod: "none",
          fields: [
            { id: "c1", name: "name", type: "string", fakerMethod: "none" },
          ],
        },
      ],
    })
    renderTab()
    expect(
      screen.getByRole("button", { name: "엔드포인트 생성" })
    ).toBeEnabled()
  })

  it("제출 페이로드의 fieldDefs 이름과 스키마 키에서 앞뒤 공백이 제거된다", () => {
    // 판정만 trim하고 저장을 원문으로 하면 스키마 키에 공백이 남는다
    setupStore({
      fields: [
        { id: "f1", name: "  title  ", type: "string", fakerMethod: "none" },
      ],
    })
    const onCreate = jest.fn()
    renderTab({ onCreate })
    fireEvent.click(screen.getByRole("button", { name: "엔드포인트 생성" }))
    const payload = onCreate.mock.calls[0][0]
    expect(payload.fieldDefs[0].name).toBe("title")
    expect(Object.keys(payload.schema)).toEqual(["id", "title"])
  })
})

