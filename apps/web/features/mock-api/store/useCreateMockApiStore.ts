import { create } from 'zustand'
import { FieldSchema, FieldType, MockResourceType } from '@workspace/types'
import { mapFieldTree } from '../utils/mapFieldTree'
import { isFakerMethodAllowed } from '@workspace/mockgen/fakerMethods'

const generateId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).substring(2, 11)
}


interface CreateMockApiSeedState {
  resourceType: MockResourceType
  apiPath: string
  fields: FieldSchema[]
  itemCount: number[]
  enablePagination: boolean
  pageParam: string
  limitParam: string
  enableSort: boolean
  sortParam: string
  orderParam: string
  enableSearch: boolean
  searchParam: string
}

interface CreateMockApiState extends CreateMockApiSeedState {
  setResourceType: (type: MockResourceType) => void
  setApiPath: (path: string) => void

  addField: () => void
  updateField: <K extends keyof FieldSchema>(id: string, key: K, value: FieldSchema[K]) => void
  changeFieldType: (id: string, newType: FieldType) => void
  removeField: (id: string) => void
  addSubfield: (parentId: string) => void

  setItemCount: (count: number[]) => void
  setEnablePagination: (val: boolean) => void
  setPageParam: (val: string) => void
  setLimitParam: (val: string) => void
  setEnableSort: (val: boolean) => void
  setSortParam: (val: string) => void
  setOrderParam: (val: string) => void
  setEnableSearch: (val: boolean) => void
  setSearchParam: (val: string) => void

  hydrate: (seed: Partial<CreateMockApiSeedState>) => void
  reset: () => void
}

const initialState: CreateMockApiSeedState = {
  resourceType: 'collection',
  apiPath: '',
  fields: [],
  itemCount: [10],
  enablePagination: false,
  pageParam: 'page',
  limitParam: 'limit',
  enableSort: false,
  sortParam: '_sort',
  orderParam: '_order',
  enableSearch: false,
  searchParam: 'q',
}

export const useCreateMockApiStore = create<CreateMockApiState>((set) => ({
  ...initialState,

  setResourceType: (resourceType) =>
    set((state) =>
      resourceType === 'object'
        ? { resourceType, enablePagination: false, enableSort: false, enableSearch: false }
        : { resourceType },
    ),

  setApiPath: (apiPath) => set({ apiPath }),

  addField: () => set((state) => ({
    fields: [...state.fields, {
      id: generateId(),
      name: '',
      type: 'string',
      fakerMethod: 'none',
    }],
  })),

  updateField: (id, key, value) => set((state) => ({
    fields: mapFieldTree(state.fields, (field) =>
      field.id === id ? { ...field, [key]: value } : field
    ),
  })),

  // primitive로 변경 시 하위 필드를 정리해 유령 서브필드 방지 (리뷰 #2)
  changeFieldType: (id, newType) => set((state) => ({
    fields: mapFieldTree(state.fields, (field) => {
      if (field.id === id) {
        // 타입을 바꾸면 이전 fakerMethod가 유효하지 않을 수 있다.
        // 판정은 카탈로그 옆(fakerMethods.ts)에 있는 것을 쓴다 — 여기서 직접
        // 조회하면 카탈로그에 없는 타입에서 {} 폴백으로 모든 메서드를 거부한다.
        const updatedFakerMethod = isFakerMethodAllowed(
          newType,
          field.fakerMethod ?? "",
        )
          ? field.fakerMethod
          : "none"
        return {
          ...field,
          type: newType,
          fakerMethod: updatedFakerMethod,
          fields: newType === "object" || newType === "array"
            ? field.fields
            : undefined,
        }
      }
      return field
    }),
  })),

  removeField: (id) => set((state) => ({
    fields: mapFieldTree(state.fields, (field) =>
      field.id === id ? null : field
    ),
  })),

  addSubfield: (parentId) => set((state) => ({
    fields: mapFieldTree(state.fields, (field) =>
      field.id === parentId
        ? {
            ...field,
            fields: [
              ...(field.fields || []),
              {
                id: generateId(),
                name: '',
                type: 'string',
                fakerMethod: 'none',
              },
            ],
          }
        : field
    ),
  })),

  setItemCount: (itemCount) => set({ itemCount }),
  setEnablePagination: (enablePagination) => set({ enablePagination }),
  setPageParam: (pageParam) => set({ pageParam }),
  setLimitParam: (limitParam) => set({ limitParam }),
  setEnableSort: (enableSort) => set({ enableSort }),
  setSortParam: (sortParam) => set({ sortParam }),
  setOrderParam: (orderParam) => set({ orderParam }),
  setEnableSearch: (enableSearch) => set({ enableSearch }),
  setSearchParam: (searchParam) => set({ searchParam }),

  hydrate: (seed) => set({ ...initialState, ...seed }),
  reset: () => set(initialState),
}))
