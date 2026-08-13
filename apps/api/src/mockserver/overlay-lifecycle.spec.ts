import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { MockserverService } from './mockserver.service';
import { MockStateService } from './mock-state.service';
import { DistributedLockService } from '../redis/distributed-lock.service';
import { REDIS_CLIENT } from '../constant/tokens';
import { FileBrowserItem } from '../database/schema/file-browser-item.schema';
import { MockStateEventService } from './mock-state-event.service';

/**
 * 오버레이 수명주기 통합 테스트.
 *
 * 다른 스펙은 MockStateService를 목으로 갈아끼우는데, 그러면 getOverlay가
 * 통째로 대체되어 normalizeOverlay를 지나지 않는다. 실제로 저장·조회를 거쳐야만
 * 드러나는 결함이 있으므로(직렬화 규약, 버전 교정), 여기서는 **진짜
 * MockStateService**를 쓰고 Redis와 분산 락만 인메모리로 대체한다.
 */
describe('오버레이 수명주기 (실제 MockStateService 경유)', () => {
  let service: MockserverService;
  let store: Map<string, string>;

  const WORKSPACE_ID = '683dea0000000000000000ab';
  const ITEM = { path: '/users', json: [{ id: 1, name: 'kim' }], options: null };

  beforeEach(async () => {
    store = new Map();

    const redis = {
      get: jest.fn(async (key: string) => store.get(key) ?? null),
      set: jest.fn(async (key: string, value: string) => {
        store.set(key, value);
        return 'OK';
      }),
      del: jest.fn(async (...keys: string[]) => {
        keys.forEach((key) => store.delete(key));
        return keys.length;
      }),
    };

    const lockService = {
      tryAcquire: jest.fn().mockResolvedValue('token-1'),
      release: jest.fn().mockResolvedValue(true),
    };

    const module = await Test.createTestingModule({
      providers: [
        MockserverService,
        MockStateService,
        {
          provide: getModelToken(FileBrowserItem.name),
          useValue: {
            // 정확 매칭(/users/1)은 없고 부모(/users)만 있는 실제 배치를 흉내낸다
            findOne: (filter: { path: string }) => ({
              lean: () => ({
                exec: async () => (filter.path === '/users' ? ITEM : null),
              }),
            }),
          },
        },
        { provide: REDIS_CLIENT, useValue: redis },
        { provide: DistributedLockService, useValue: lockService },
        {
          provide: MockStateEventService,
          useValue: { publish: jest.fn(), publishMany: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(MockserverService);
  });

  const overlayKey = `mock:state:${WORKSPACE_ID}:/users`;

  it('DELETE로 지운 id를 POST로 다시 만들면 GET에 나타난다', async () => {
    const deleted = await service.resolveRequest(
      WORKSPACE_ID,
      '/api/users/1',
      'DELETE',
      {},
      null,
    );
    expect(deleted.status).toBe(200);

    const created = await service.resolveRequest(
      WORKSPACE_ID,
      '/api/users',
      'POST',
      {},
      { name: 'again' },
    );
    expect(created.status).toBe(201);
    // 컬렉션이 비었으므로 id 1이 재발급된다
    expect((created.body as { id: number }).id).toBe(1);

    const listed = await service.resolveRequest(
      WORKSPACE_ID,
      '/api/users',
      'GET',
      {},
      null,
    );

    // 여기가 핵심이다. 저장 → 조회를 실제로 거쳐야 normalizeOverlay가
    // 방금 만든 행을 구버전 찌꺼기로 오인해 지우는지 알 수 있다.
    expect(listed.body).toEqual([{ name: 'again', id: 1 }]);
  });

  it('저장한 오버레이에는 버전 표식이 붙는다', async () => {
    await service.resolveRequest(
      WORKSPACE_ID,
      '/api/users',
      'POST',
      {},
      { name: 'park' },
    );

    // 표식이 없으면 normalizeOverlay가 이 값을 구버전으로 오인한다
    expect(JSON.parse(store.get(overlayKey)!)).toMatchObject({ v: 2 });
  });

  it('구버전 오버레이(표식 없음)는 지운 생성 행을 되살리지 않는다', async () => {
    // 구버전 코드는 생성 행을 지울 때 created에 남긴 채 deleted에만 넣었다
    store.set(
      overlayKey,
      JSON.stringify({
        created: [{ id: 3, name: 'park' }],
        updated: {},
        deleted: ['3'],
      }),
    );

    const listed = await service.resolveRequest(
      WORKSPACE_ID,
      '/api/users',
      'GET',
      {},
      null,
    );

    expect(listed.body).toEqual([{ id: 1, name: 'kim' }]);
  });

  it('생성 → 삭제 → 재생성을 반복해도 컬렉션이 망가지지 않는다', async () => {
    for (let i = 0; i < 3; i += 1) {
      const created = await service.resolveRequest(
        WORKSPACE_ID,
        '/api/users',
        'POST',
        {},
        { name: `row-${i}` },
      );
      expect(created.status).toBe(201);

      const id = (created.body as { id: number }).id;
      const deleted = await service.resolveRequest(
        WORKSPACE_ID,
        `/api/users/${id}`,
        'DELETE',
        {},
        null,
      );
      expect(deleted.status).toBe(200);
    }

    const listed = await service.resolveRequest(
      WORKSPACE_ID,
      '/api/users',
      'GET',
      {},
      null,
    );

    // 만든 것을 전부 지웠으므로 base만 남아야 한다
    expect(listed.body).toEqual([{ id: 1, name: 'kim' }]);
  });
});
