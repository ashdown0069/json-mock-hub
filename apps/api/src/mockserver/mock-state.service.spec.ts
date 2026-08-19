import { ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { MockStateService } from './mock-state.service';
import { REDIS_CLIENT } from '../constant/tokens';
import { createEmptyOverlay } from './mock-state.util';
import { DistributedLockService } from '../redis/distributed-lock.service';
import { MockStateEventService } from './mock-state-event.service';
import { FileBrowserItem } from '../database/schema/file-browser-item.schema';

describe('MockStateService', () => {
  let service: MockStateService;
  let redis: { get: jest.Mock; set: jest.Mock; del: jest.Mock };
  let lockService: { tryAcquire: jest.Mock; release: jest.Mock };
  let stateEvent: { publish: jest.Mock; publishMany: jest.Mock };
  let mockItemModel: { findOne: jest.Mock };

  beforeEach(async () => {
    redis = { get: jest.fn(), set: jest.fn(), del: jest.fn() };
    lockService = {
      tryAcquire: jest.fn().mockResolvedValue('token-1'),
      release: jest.fn().mockResolvedValue(true),
    };
    stateEvent = {
      publish: jest.fn().mockResolvedValue(undefined),
      publishMany: jest.fn().mockResolvedValue(undefined),
    };
    mockItemModel = {
      findOne: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      }),
    };
    const module = await Test.createTestingModule({
      providers: [
        MockStateService,
        { provide: REDIS_CLIENT, useValue: redis },
        { provide: getModelToken(FileBrowserItem.name), useValue: mockItemModel },
        { provide: DistributedLockService, useValue: lockService },
        { provide: MockStateEventService, useValue: stateEvent },
      ],
    }).compile();
    service = module.get(MockStateService);
  });

  it('저장된 값이 없으면 빈 오버레이를 반환한다', async () => {
    redis.get.mockResolvedValue(null);
    const result = await service.getOverlay('ws1', '/users');
    expect(result).toEqual(createEmptyOverlay());
    expect(redis.get).toHaveBeenCalledWith('mock:state:ws1:/users');
  });

  it('저장된 JSON을 역직렬화해 반환한다', async () => {
    const overlay = { created: [{ id: 3 }], updated: {}, deleted: [] };
    redis.get.mockResolvedValue(JSON.stringify(overlay));
    expect(await service.getOverlay('ws1', '/users')).toEqual(overlay);
  });


  it('손상된 형태(배열)를 빈 오버레이로 교정한다', () => {
    redis.get.mockResolvedValue('[]');

    return expect(service.getOverlay('ws1', '/users')).resolves.toEqual(
      createEmptyOverlay(),
    );
  });

  it('setOverlay는 오버레이를 TTL 3600초로 직렬화 저장한다', async () => {
    const overlay = createEmptyOverlay();
    await service.setOverlay('ws1', '/users', overlay);

    expect(redis.set).toHaveBeenCalledWith(
      'mock:state:ws1:/users',
      JSON.stringify(overlay),
      'EX',
      3600,
    );
  });

  it('reset은 키를 삭제한다', async () => {
    await service.reset('ws1', '/users');
    expect(redis.del).toHaveBeenCalledWith('mock:state:ws1:/users');
  });

  it('reset은 키 삭제 후 이벤트를 발행한다', async () => {
    await service.reset('ws1', '/users');

    expect(stateEvent.publish).toHaveBeenCalledWith({
      workspaceId: 'ws1',
      path: '/users',
    });
  });

  describe('resetMany', () => {
    it('여러 경로를 한 번의 del 호출로 삭제한다', async () => {
      await service.resetMany('ws1', ['/users', '/posts']);

      // 경로가 N개여도 왕복은 1회여야 한다 (폴더 이동은 하위 수만큼 경로를 만든다)
      expect(redis.del).toHaveBeenCalledTimes(1);
      expect(redis.del).toHaveBeenCalledWith(
        'mock:state:ws1:/users',
        'mock:state:ws1:/posts',
      );
    });

    it('중복 경로는 한 번만 전달한다', async () => {
      await service.resetMany('ws1', ['/users', '/users']);

      expect(redis.del).toHaveBeenCalledWith('mock:state:ws1:/users');
    });

    it('빈 배열이면 redis를 호출하지 않는다', async () => {
      await service.resetMany('ws1', []);

      expect(redis.del).not.toHaveBeenCalled();
    });

    describe('resetMany 이벤트 발행', () => {
      it('중복 제거된 경로로 publishMany를 호출한다', async () => {
        await service.resetMany('ws1', ['/users', '/users', '/posts']);

        expect(stateEvent.publishMany).toHaveBeenCalledWith('ws1', [
          '/users',
          '/posts',
        ]);
      });

      it('빈 배열이면 이벤트를 발행하지 않는다', async () => {
        await service.resetMany('ws1', []);

        expect(stateEvent.publishMany).not.toHaveBeenCalled();
      });
    });
  });

  describe('mutate', () => {
    it('락을 먼저 잡은 뒤 오버레이를 읽어 콜백에 넘긴다', async () => {
      const stored = { created: [{ id: 1 }], updated: {}, deleted: [] };
      // 호출 순서를 기록한다. jest-extended가 없으므로 matcher 대신 배열로 검증한다.
      const order: string[] = [];
      lockService.tryAcquire.mockImplementation(async () => {
        order.push('lock');
        return 'token-1';
      });
      redis.get.mockImplementation(async () => {
        order.push('get');
        return JSON.stringify(stored);
      });

      let seen: unknown;
      const result = await service.mutate('ws1', '/users', (overlay) => {
        seen = overlay;
        return { overlay, result: 'ok' };
      });

      // 락 밖에서 읽은 값으로 계산하면 락을 걸어도 나중 쓰기가 앞선 쓰기를 덮어쓴다
      expect(order).toEqual(['lock', 'get']);
      expect(seen).toEqual(stored);
      expect(result).toBe('ok');
    });

    it('콜백이 돌려준 오버레이를 저장한다', async () => {
      redis.get.mockResolvedValue(null);
      const next = { created: [{ id: 9 }], updated: {}, deleted: [] };

      await service.mutate('ws1', '/users', () => ({
        overlay: next,
        result: next.created[0],
      }));

      expect(redis.set).toHaveBeenCalledWith(
        'mock:state:ws1:/users',
        JSON.stringify(next),
        'EX',
        3600,
      );
    });

    it('콜백이 overlay: null을 돌려주면 저장하지 않고 result를 그대로 반환한다', async () => {
      redis.get.mockResolvedValue(null);

      // 저장 여부(overlay)와 결과(result)를 분리했으므로,
      // 저장하지 않으면서도 거절 사유를 호출부로 전달할 수 있다
      const result = await service.mutate('ws1', '/users', () => ({
        overlay: null,
        result: { ok: false, reason: 'conflict' },
      }));

      expect(result).toEqual({ ok: false, reason: 'conflict' });
      expect(redis.set).not.toHaveBeenCalled();
    });

    it('성공 여부와 무관하게 락을 해제한다', async () => {
      redis.get.mockResolvedValue(null);

      await expect(
        service.mutate('ws1', '/users', () => {
          throw new Error('boom');
        }),
      ).rejects.toThrow('boom');

      expect(lockService.release).toHaveBeenCalledWith(
        'mock-state:ws1:/users',
        'token-1',
      );
    });

    it('재시도해도 락을 못 얻으면 503을 던진다', async () => {
      lockService.tryAcquire.mockResolvedValue(null);

      await expect(
        service.mutate('ws1', '/users', () => ({
          overlay: null,
          result: null,
        })),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);

      // 최초 1회 + 재시도 5회
      expect(lockService.tryAcquire).toHaveBeenCalledTimes(6);
      expect(lockService.release).not.toHaveBeenCalled();
    });

    it('콜백이 오버레이를 반환하면 저장 후 이벤트를 발행한다', async () => {
      redis.get.mockResolvedValue(null);
      const next = { created: [{ id: 9 }], updated: {}, deleted: [] };

      await service.mutate('ws1', '/users', () => ({
        overlay: next,
        result: next.created[0],
      }));

      expect(stateEvent.publish).toHaveBeenCalledWith({
        workspaceId: 'ws1',
        path: '/users',
      });
    });

    it('콜백이 overlay: null을 반환하면 이벤트를 발행하지 않는다', async () => {
      redis.get.mockResolvedValue(null);

      await service.mutate('ws1', '/users', () => ({
        overlay: null,
        result: { ok: false, reason: 'conflict' },
      }));

      expect(stateEvent.publish).not.toHaveBeenCalled();
    });
  });

  describe('getEffectiveJson', () => {
    it('파일이 존재하지 않으면 NotFoundException을 던진다', async () => {
      mockItemModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });

      await expect(
        service.getEffectiveJson('64b8f0f0f0f0f0f0f0f0f0f0', '/users'),
      ).rejects.toThrow();
    });

    it('base JSON과 Redis 오버레이를 병합하여 반환한다', async () => {
      mockItemModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            json: [{ id: 1, name: 'Alice' }],
          }),
        }),
      });

      redis.get.mockResolvedValue(
        JSON.stringify({
          created: [{ id: 2, name: 'Bob' }],
          updated: {},
          deleted: [],
        }),
      );

      const result = await service.getEffectiveJson(
        '64b8f0f0f0f0f0f0f0f0f0f0',
        '/users',
      );

      expect(result).toEqual([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]);
    });
  });
});
