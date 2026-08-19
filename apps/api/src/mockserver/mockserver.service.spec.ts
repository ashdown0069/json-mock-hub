import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { MockserverService } from './mockserver.service';
import { FileBrowserItem } from '../database/schema/file-browser-item.schema';

import { MockStateService } from './mock-state.service';
import { createEmptyOverlay } from './mock-state.util';

describe('MockserverService', () => {
  let service: MockserverService;
  let findOneMock: jest.Mock;
  let mockStateService: {
    getOverlay: jest.Mock;
    setOverlay: jest.Mock;
    reset: jest.Mock;
    resetMany: jest.Mock;
    mutate: jest.Mock;
    getEffectiveJson: jest.Mock;
  };

  beforeEach(async () => {
    findOneMock = jest.fn();
    mockStateService = {
      getOverlay: jest.fn().mockResolvedValue(createEmptyOverlay()),
      setOverlay: jest.fn().mockResolvedValue(undefined),
      reset: jest.fn().mockResolvedValue(undefined),
      resetMany: jest.fn().mockResolvedValue(undefined),
      getEffectiveJson: jest.fn().mockResolvedValue([{ id: 1 }]),
      // 실제 구현과 같은 순서로 동작하게: 저장된 오버레이를 콜백에 넘기고
      // overlay가 있을 때만 저장한다
      mutate: jest.fn(async (_ws: string, _path: string, fn: any) => {
        const current = await mockStateService.getOverlay();
        const applied = fn(current);
        if (applied.overlay) {
          await mockStateService.setOverlay(_ws, _path, applied.overlay);
        }
        return applied.result;
      }),
    };

    const module = await Test.createTestingModule({
      providers: [
        MockserverService,
        {
          provide: getModelToken(FileBrowserItem.name),
          useValue: { findOne: findOneMock },
        },
        {
          provide: MockStateService,
          useValue: mockStateService,
        },
      ],
    }).compile();

    service = module.get(MockserverService);
  });

  const WORKSPACE_ID = '683dea0000000000000000ab';

  const mockFindOneResult = (item: any) => {
    findOneMock.mockReturnValue({
      lean: () => ({ exec: () => Promise.resolve(item) }),
    });
  };

  it('정확 매칭된 파일의 JSON 배열을 반환한다 (GET 컬렉션)', async () => {
    const mockItem = {
      json: [{ id: 1 }, { id: 2 }],
      options: null,
    };
    mockFindOneResult(mockItem);

    const result = await service.resolveRequest(
      WORKSPACE_ID,
      '/api/users',
      'GET',
      {},
      null,
    );

    expect(result.status).toBe(200);
    expect(result.body).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('GET 컬렉션에서 options.sort=true 일 때 정렬 쿼리를 적용한다', async () => {
    const mockItem = {
      path: '/users',
      json: [
        { id: 1, role: 'user', age: 30 },
        { id: 2, role: 'admin', age: 20 },
        { id: 3, role: 'user', age: 40 },
      ],
      options: { sort: true },
    };
    mockFindOneResult(mockItem);

    const result = await service.resolveRequest(
      WORKSPACE_ID,
      '/api/users',
      'GET',
      { _sort: 'age', _order: 'desc' },
      null,
    );

    expect(result.status).toBe(200);
    expect((result.body as any[]).map((r) => r.id)).toEqual([3, 1, 2]);
  });

  describe('옵션 기반 정렬·검색', () => {
    const json = [
      { id: 1, name: 'kim', age: 30 },
      { id: 2, name: 'lee', age: 20 },
    ];

    it('options.sort가 켜진 아이템은 설정된 파라미터명으로 정렬된다', async () => {
      mockFindOneResult({
        path: '/users',
        itemType: 'File',
        json,
        options: {
          pagination: false,
          sort: true,
          sortParams: { sortParam: 'orderBy', orderParam: 'direction' },
        },
      });
      const res = await service.resolveRequest(
        WORKSPACE_ID,
        '/users',
        'GET',
        { orderBy: 'age', direction: 'desc' },
        undefined,
      );
      expect((res.body as any[]).map((r) => r.age)).toEqual([30, 20]);
    });

    it('options.sort가 꺼진 아이템은 _sort 파라미터를 무시한다', async () => {
      mockFindOneResult({
        path: '/users',
        itemType: 'File',
        json,
        options: { pagination: false },
      });
      const res = await service.resolveRequest(
        WORKSPACE_ID,
        '/users',
        'GET',
        { _sort: 'age', _order: 'desc' },
        undefined,
      );
      expect((res.body as any[]).map((r) => r.id)).toEqual([1, 2]);
    });

    it('options.search가 켜진 아이템은 설정된 파라미터명으로 검색된다', async () => {
      mockFindOneResult({
        path: '/users',
        itemType: 'File',
        json,
        options: {
          pagination: false,
          search: true,
          searchParams: { searchParam: 'keyword' },
        },
      });
      const res = await service.resolveRequest(
        WORKSPACE_ID,
        '/users',
        'GET',
        { keyword: 'kim' },
        undefined,
      );
      expect(res.body).toEqual([{ id: 1, name: 'kim', age: 30 }]);
    });

    it('sort/search가 켜져 있어도 파라미터명이 없으면 기본값(_sort/_order/q)을 사용한다', async () => {
      mockFindOneResult({
        path: '/users',
        itemType: 'File',
        json,
        options: { pagination: false, sort: true, search: true },
      });
      const res = await service.resolveRequest(
        WORKSPACE_ID,
        '/users',
        'GET',
        { q: 'lee', _sort: 'age' },
        undefined,
      );
      expect(res.body).toEqual([{ id: 2, name: 'lee', age: 20 }]);
    });

    it('필드 필터(?name=kim)는 더 이상 적용되지 않는다', async () => {
      mockFindOneResult({
        path: '/users',
        itemType: 'File',
        json,
        options: { pagination: false },
      });
      const res = await service.resolveRequest(
        WORKSPACE_ID,
        '/users',
        'GET',
        { name: 'kim' },
        undefined,
      );
      expect(res.body).toHaveLength(2);
    });
  });

  it('매칭되는 파일이 없으면 NotFoundException을 던진다', async () => {
    findOneMock.mockReturnValue({
      lean: () => ({ exec: () => Promise.resolve(null) }),
    });

    await expect(
      service.resolveRequest(
        '683dea0000000000000000ab',
        '/api/unknown',
        'GET',
        {},
        null,
      ),
    ).rejects.toThrow();
  });

  it('존재하지 않는 id에 대한 PUT 요청은 404를 반환한다 (GET과 일관성)', async () => {
    const mockItem = {
      json: [{ id: 1, name: 'kim' }],
      options: null,
    };
    findOneMock.mockReturnValueOnce({
      lean: () => ({ exec: () => Promise.resolve(null) }), // 1차 조회 실패
    });
    findOneMock.mockReturnValueOnce({
      lean: () => ({ exec: () => Promise.resolve(mockItem) }), // 2차 조회 성공 (부모)
    });

    const result = await service.resolveRequest(
      '683dea0000000000000000ab',
      '/users/999',
      'PUT',
      {},
      { name: 'lee' },
    );

    expect(result.status).toBe(404);
  });

  it('PUT 병합 응답은 저장된 id의 타입(숫자)을 보존한다', async () => {
    const mockItem = {
      json: [{ id: 1, name: 'kim' }],
      options: null,
    };
    findOneMock.mockReturnValueOnce({
      lean: () => ({ exec: () => Promise.resolve(null) }), // 1차 정확매칭 실패
    });
    findOneMock.mockReturnValueOnce({
      lean: () => ({ exec: () => Promise.resolve(mockItem) }), // 2차 부모 매칭
    });

    const result = await service.resolveRequest(
      '683dea0000000000000000ab',
      '/users/1',
      'PUT',
      {},
      { name: 'lee' },
    );

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ id: 1, name: 'lee' });
    expect(typeof (result.body as any).id).toBe('number');
    expect(mockStateService.setOverlay).toHaveBeenCalled();
  });

  it('POST 요청 시 새 id를 부여하고 오버레이를 저장한다', async () => {
    const mockItem = {
      path: '/users',
      json: [{ id: 1, name: 'kim' }],
      options: null,
    };
    findOneMock.mockReturnValue({
      lean: () => ({ exec: () => Promise.resolve(mockItem) }),
    });

    const result = await service.resolveRequest(
      '683dea0000000000000000ab',
      '/users',
      'POST',
      {},
      { name: 'park' },
    );

    expect(result.status).toBe(201);
    expect(result.body).toEqual({ id: 2, name: 'park' });
    expect(mockStateService.setOverlay).toHaveBeenCalled();
  });

  it('DELETE 요청 시 삭제 항목을 오버레이에 기록한다', async () => {
    const mockItem = {
      path: '/users',
      json: [{ id: 1, name: 'kim' }],
      options: null,
    };
    findOneMock.mockReturnValueOnce({
      lean: () => ({ exec: () => Promise.resolve(null) }),
    });
    findOneMock.mockReturnValueOnce({
      lean: () => ({ exec: () => Promise.resolve(mockItem) }),
    });

    const result = await service.resolveRequest(
      '683dea0000000000000000ab',
      '/users/1',
      'DELETE',
      {},
      null,
    );

    expect(result.status).toBe(200);
    expect(result.body).toEqual({});
    expect(mockStateService.setOverlay).toHaveBeenCalled();
  });

  describe('쓰기 경로의 임계구역', () => {
    it('POST는 mutate 안에서 오버레이를 갱신한다', async () => {
      mockFindOneResult({ path: '/users', json: [{ id: 1 }], options: null });

      const result = await service.resolveRequest(
        WORKSPACE_ID,
        '/api/users',
        'POST',
        {},
        { name: 'kim' },
      );

      expect(result.status).toBe(201);
      expect(mockStateService.mutate).toHaveBeenCalledWith(
        WORKSPACE_ID,
        '/users',
        expect.any(Function),
      );
      // 락 밖에서 setOverlay를 직접 부르면 유실이 남는다
      expect(mockStateService.setOverlay).toHaveBeenCalledTimes(1);
    });

    it('POST 콜백은 락 안에서 읽은 오버레이로 실효 컬렉션을 다시 계산한다', async () => {
      mockFindOneResult({ path: '/users', json: [{ id: 1 }], options: null });
      // 락을 잡은 뒤 다른 요청이 이미 id 2를 만들어 둔 상황
      mockStateService.getOverlay.mockResolvedValue({
        created: [{ id: 2, name: 'other' }],
        updated: {},
        deleted: [],
      });

      const result = await service.resolveRequest(
        WORKSPACE_ID,
        '/api/users',
        'POST',
        {},
        { name: 'kim' },
      );

      // base(id 1) + 동시 생성분(id 2) 기준으로 다음 id는 3이어야 한다.
      // 락 밖에서 읽은 값으로 계산하면 2가 되어 앞선 쓰기를 덮어쓴다.
      expect((result.body as { id: number }).id).toBe(3);
    });

    it('PUT은 대상이 없으면 404이고 저장하지 않는다', async () => {
      findOneMock.mockReturnValueOnce({
        lean: () => ({ exec: () => Promise.resolve(null) }),
      });
      findOneMock.mockReturnValueOnce({
        lean: () =>
          ({ exec: () => Promise.resolve({ path: '/users', json: [{ id: 1 }], options: null }) } as any),
      });

      const result = await service.resolveRequest(
        WORKSPACE_ID,
        '/api/users/99',
        'PUT',
        {},
        { name: 'x' },
      );

      expect(result.status).toBe(404);
      expect(mockStateService.setOverlay).not.toHaveBeenCalled();
    });

    it('DELETE는 mutate 안에서 오버레이를 갱신한다', async () => {
      findOneMock.mockReturnValueOnce({
        lean: () => ({ exec: () => Promise.resolve(null) }),
      });
      findOneMock.mockReturnValueOnce({
        lean: () =>
          ({ exec: () => Promise.resolve({ path: '/users', json: [{ id: 1 }], options: null }) } as any),
      });

      const result = await service.resolveRequest(
        WORKSPACE_ID,
        '/api/users/1',
        'DELETE',
        {},
        null,
      );

      expect(result.status).toBe(200);
      expect(mockStateService.mutate).toHaveBeenCalledTimes(1);
    });

    it('생성 행 상한을 넘으면 429를 반환한다', async () => {
      mockFindOneResult({ path: '/users', json: [], options: null });
      mockStateService.getOverlay.mockResolvedValue({
        created: Array.from({ length: 500 }, (_, i) => ({ id: i + 1 })),
        updated: {},
        deleted: [],
      });

      const result = await service.resolveRequest(
        WORKSPACE_ID,
        '/api/users',
        'POST',
        {},
        { name: 'kim' },
      );

      expect(result.status).toBe(429);
      expect(mockStateService.setOverlay).not.toHaveBeenCalled();
    });

    it('이미 있는 id로 POST하면 409를 반환하고 저장하지 않는다', async () => {
      mockFindOneResult({ path: '/users', json: [{ id: 1 }], options: null });

      const result = await service.resolveRequest(
        WORKSPACE_ID,
        '/api/users',
        'POST',
        {},
        { id: 1, name: '덮어씀' },
      );

      expect(result.status).toBe(409);
      expect(mockStateService.setOverlay).not.toHaveBeenCalled();
    });

    it('DELETE로 지운 id를 POST로 다시 만들면 201이고 조회된다', async () => {
      // 조사에서 확인한 버그의 회귀 방지. 지운 id가 재발급되면서
      // 201을 주고도 GET에 나타나지 않던 시나리오다.
      mockFindOneResult({ path: '/users', json: [{ id: 1 }], options: null });
      mockStateService.getOverlay.mockResolvedValue({
        created: [],
        updated: {},
        deleted: ['1'],
      });

      const created = await service.resolveRequest(
        WORKSPACE_ID,
        '/api/users',
        'POST',
        {},
        { name: 'again' },
      );

      expect(created.status).toBe(201);
      expect((created.body as { id: number }).id).toBe(1);

      // 저장된 오버레이로 GET하면 방금 만든 행이 보여야 한다
      const savedOverlay = mockStateService.setOverlay.mock.calls[0][2];
      mockStateService.getOverlay.mockResolvedValue(savedOverlay);

      const listed = await service.resolveRequest(
        WORKSPACE_ID,
        '/api/users',
        'GET',
        {},
        null,
      );

      expect(listed.body).toEqual([{ name: 'again', id: 1 }]);
    });
  });

  describe('getEffectiveJson', () => {
    it('MockStateService로 getEffectiveJson 호출을 위임한다', async () => {
      mockStateService.getEffectiveJson.mockResolvedValue([{ id: 2 }, { id: 3 }]);

      const result = await service.getEffectiveJson(WORKSPACE_ID, '/users');

      expect(result).toEqual([{ id: 2 }, { id: 3 }]);
      expect(mockStateService.getEffectiveJson).toHaveBeenCalledWith(
        WORKSPACE_ID,
        '/users',
      );
    });

    it('MockStateService가 에러를 던지면 그대로 전파한다', async () => {
      mockStateService.getEffectiveJson.mockRejectedValue(
        new NotFoundException('파일 없음'),
      );

      await expect(
        service.getEffectiveJson(WORKSPACE_ID, '/missing'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
