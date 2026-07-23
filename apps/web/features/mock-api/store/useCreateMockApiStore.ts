import { create } from 'zustand'
import { FieldSchema, FieldType } from '@/types/schema'
import { mapFieldTree } from '../utils/mapFieldTree'
import { generateUUID } from '../utils/uuid'
import { FAKER_BY_TYPE } from '@workspace/mockgen/fakerMethods'

interface CreateMockApiSeedState {
  apiPath: string
  fields: FieldSchema[]
  itemCount: number[]
  enablePagination: boolean
  pageParam: string
  limitParam: string
}

interface CreateMockApiState extends CreateMockApiSeedState {
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

  hydrate: (seed: Partial<CreateMockApiSeedState>) => void
  reset: () => void
}

const initialState: CreateMockApiSeedState = {
  apiPath: '',
  fields: [],
  itemCount: [10],
  enablePagination: false,
  pageParam: 'page',
  limitParam: 'limit',
}

export const useCreateMockApiStore = create<CreateMockApiState>((set) => ({
  ...initialState,

  setApiPath: (apiPath) => set({ apiPath }),

  addField: () => set((state) => ({
    fields: [...state.fields, {
      id: generateUUID(),
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
        const allowedModules = FAKER_BY_TYPE[newType as keyof typeof FAKER_BY_TYPE] || {}
        let updatedFakerMethod = field.fakerMethod
        if (field.fakerMethod && field.fakerMethod !== "none") {
          const [mod, method] = field.fakerMethod.split(".")
          const isAllowed = mod && method ? (allowedModules as any)[mod]?.includes(method) : false
          if (!isAllowed) {
            updatedFakerMethod = "none"
          }
        }
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
                id: generateUUID(),
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

  hydrate: (seed) => set({ ...initialState, ...seed }),
  reset: () => set(initialState),
}))
