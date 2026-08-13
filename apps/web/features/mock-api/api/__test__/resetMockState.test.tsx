import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useResetMockState, type ResetMockStatePayload } from '../resetMockState'
import { axiosInstance } from '@/lib/axios'

jest.mock("next-intl", () => ({
  useTranslations: () => {
    const t = (key: string) => key
    t.has = () => false
    return t
  },
}))

jest.mock('@/lib/axios', () => {
  const instance = { post: jest.fn() }
  return { __esModule: true, default: instance, axiosInstance: instance }
})

const mockedAxios = axiosInstance as jest.Mocked<typeof axiosInstance>

function createWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

describe('useResetMockState', () => {
  it('itemId로 resetMockState 엔드포인트에 POST한다', async () => {
    mockedAxios.post.mockResolvedValue({ data: { success: true } })
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const { result } = renderHook(() => useResetMockState('ws1'), {
      wrapper: createWrapper(client),
    })

    const payload: ResetMockStatePayload = { itemId: 'item1' }
    result.current.mutate(payload)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(axiosInstance.post).toHaveBeenCalledWith('/ws1/filebrowser/resetMockState', {
      itemId: 'item1',
    })
  })

  it('초기화 성공 시 파일 목록과 mock 상태 쿼리를 모두 무효화한다', async () => {
    mockedAxios.post.mockResolvedValue({ data: { success: true } })
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const invalidateSpy = jest.spyOn(client, 'invalidateQueries')

    const { result } = renderHook(() => useResetMockState('ws1'), {
      wrapper: createWrapper(client),
    })
    result.current.mutate({ itemId: 'item1' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['workspaces', 'ws1', 'browser'],
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['workspaces', 'ws1', 'mockState'],
    })
  })
})
