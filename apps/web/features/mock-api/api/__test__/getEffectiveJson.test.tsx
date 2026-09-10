import { renderHook, waitFor, act } from '@testing-library/react'
import {
  QueryClient,
  QueryClientProvider,
  focusManager,
  onlineManager,
} from '@tanstack/react-query'
import { useGetEffectiveJson, getEffectiveJson } from '../getEffectiveJson'
import { axiosInstance } from '@/lib/axios'

jest.mock('@/lib/axios', () => {
  const instance = { get: jest.fn() }
  return { __esModule: true, default: instance, axiosInstance: instance }
})

const mockedAxios = axiosInstance as jest.Mocked<typeof axiosInstance>

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
}

afterEach(() => {
  focusManager.setFocused(undefined)
  onlineManager.setOnline(true)
  jest.resetAllMocks()
})

describe('getEffectiveJson', () => {
  it('workspaceId와 path로 effective 엔드포인트를 조회한다', async () => {
    mockedAxios.get.mockResolvedValue({ data: [{ id: 1 }] })

    const result = await getEffectiveJson('ws1', '/users')

    expect(axiosInstance.get).toHaveBeenCalledWith('/ws1/mockstate/effective', {
      params: { path: '/users' },
    })
    expect(result).toEqual([{ id: 1 }])
  })
})

describe('useGetEffectiveJson', () => {
  it('응답이 오기 전에는 placeholderData를 보여준다', () => {
    mockedAxios.get.mockReturnValue(new Promise(() => {}))
    const wrapper = createWrapper()
    const { result } = renderHook(
      () => useGetEffectiveJson('ws1', '/users', [{ id: 'placeholder' }]),
      { wrapper }
    )

    expect(result.current.data).toEqual([{ id: 'placeholder' }])
  })

  it('조회 성공 시 서버 데이터로 교체된다', async () => {
    mockedAxios.get.mockResolvedValue({ data: [{ id: 1 }, { id: 2 }] })
    const wrapper = createWrapper()
    const { result } = renderHook(
      () => useGetEffectiveJson('ws1', '/users', []),
      { wrapper }
    )

    await waitFor(() =>
      expect(result.current.data).toEqual([{ id: 1 }, { id: 2 }])
    )
  })

  it.each(['focus', 'online'] as const)(
    'fresh 미리보기도 %s 복귀 시 재조회한다',
    async (event) => {
      onlineManager.setOnline(true)
      focusManager.setFocused(true)
      const client = new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            staleTime: 1_800_000,
            refetchOnWindowFocus: false,
            refetchOnMount: false,
          },
        },
      })
      mockedAxios.get.mockReset()
      mockedAxios.get
        .mockResolvedValueOnce({ data: [{ id: 1, name: 'before' }] })
        .mockResolvedValue({ data: [{ id: 1, name: 'after' }] })
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      )
      const { result, unmount } = renderHook(
        () => useGetEffectiveJson('ws1', '/users', []),
        { wrapper }
      )
      await waitFor(() =>
        expect(result.current.data).toEqual([{ id: 1, name: 'before' }])
      )
      act(() => {
        if (event === 'focus') focusManager.setFocused(false)
        else onlineManager.setOnline(false)
      })
      act(() => {
        if (event === 'focus') focusManager.setFocused(true)
        else onlineManager.setOnline(true)
      })
      await waitFor(() =>
        expect(result.current.data).toEqual([{ id: 1, name: 'after' }])
      )
      expect(mockedAxios.get).toHaveBeenCalledTimes(2)
      unmount()
      client.clear()
    }
  )
})
