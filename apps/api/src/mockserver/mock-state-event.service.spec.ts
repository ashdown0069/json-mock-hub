import { Test, TestingModule } from '@nestjs/testing';
import { firstValueFrom } from 'rxjs';
import {
  MockStateEvent,
  MockStateEventService,
} from './mock-state-event.service';
import { REDIS_CLIENT } from '../constant/tokens';

describe('MockStateEventService', () => {
  let service: MockStateEventService;
  let mockPublisher: {
    publish: jest.Mock;
    duplicate: jest.Mock;
  };
  let mockSubscriber: {
    subscribe: jest.Mock;
    on: jest.Mock;
    quit: jest.Mock;
  };

  beforeEach(async () => {
    mockSubscriber = {
      subscribe: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      quit: jest.fn().mockResolvedValue(undefined),
    };

    mockPublisher = {
      publish: jest.fn().mockResolvedValue(1),
      duplicate: jest.fn().mockReturnValue(mockSubscriber),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MockStateEventService,
        {
          provide: REDIS_CLIENT,
          useValue: mockPublisher,
        },
      ],
    }).compile();

    service = module.get<MockStateEventService>(MockStateEventService);
  });

  const getMessageHandler = () =>
    mockSubscriber.on.mock.calls.find((call) => call[0] === 'message')?.[1] as (
      channel: string,
      message: string,
    ) => void;

  it('서비스가 정의되어야 한다', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('주입된 publisher를 duplicate()하여 구독 전용 커넥션을 만든다', async () => {
      await service.onModuleInit();

      expect(mockPublisher.duplicate).toHaveBeenCalledTimes(1);
      expect(mockSubscriber.subscribe).toHaveBeenCalledWith('mockstate:updated');
    });

    it('subscriber에 error 리스너를 등록한다 (미등록 시 프로세스 크래시 위험)', async () => {
      await service.onModuleInit();

      const errorCall = mockSubscriber.on.mock.calls.find(
        (call) => call[0] === 'error',
      );
      expect(errorCall).toBeDefined();
      expect(typeof errorCall?.[1]).toBe('function');
    });
  });

  describe('publish', () => {
    it('직렬화된 페이로드를 Redis 채널로 발행한다', async () => {
      const payload: MockStateEvent = { workspaceId: 'ws-1', path: '/users' };
      await service.publish(payload);

      expect(mockPublisher.publish).toHaveBeenCalledWith(
        'mockstate:updated',
        JSON.stringify(payload),
      );
    });

    it('publish 실패 시 예외를 밖으로 던지지 않는다', async () => {
      mockPublisher.publish.mockRejectedValueOnce(new Error('redis down'));

      await expect(
        service.publish({ workspaceId: 'ws-1', path: '/users' }),
      ).resolves.toBeUndefined();
    });
  });

  describe('publishMany', () => {
    it('경로 수만큼 개별 이벤트를 발행한다', async () => {
      await service.publishMany('ws-1', ['/users', '/posts']);

      expect(mockPublisher.publish).toHaveBeenCalledTimes(2);
      expect(mockPublisher.publish).toHaveBeenCalledWith(
        'mockstate:updated',
        JSON.stringify({ workspaceId: 'ws-1', path: '/users' }),
      );
      expect(mockPublisher.publish).toHaveBeenCalledWith(
        'mockstate:updated',
        JSON.stringify({ workspaceId: 'ws-1', path: '/posts' }),
      );
    });
  });

  describe('subscribe', () => {
    it('workspaceId가 일치하는 이벤트만 전달한다', async () => {
      await service.onModuleInit();
      const messageHandler = getMessageHandler();

      const workspaceId = 'ws-123';
      const eventPromise = firstValueFrom(service.subscribe(workspaceId));

      messageHandler(
        'mockstate:updated',
        JSON.stringify({ workspaceId: 'other-ws', path: '/users' }),
      );
      messageHandler(
        'mockstate:updated',
        JSON.stringify({ workspaceId, path: '/posts' }),
      );

      const receivedEvent = await eventPromise;
      expect(receivedEvent.workspaceId).toBe(workspaceId);
      expect(receivedEvent.path).toBe('/posts');

      await service.onModuleDestroy();
    });

    it('형태가 잘못된 페이로드는 무시한다', async () => {
      await service.onModuleInit();
      const messageHandler = getMessageHandler();

      const received: MockStateEvent[] = [];
      const subscription = service
        .subscribe('ws-1')
        .subscribe((event) => received.push(event));

      messageHandler('mockstate:updated', JSON.stringify({ path: '/users' }));
      messageHandler(
        'mockstate:updated',
        JSON.stringify({ workspaceId: 'ws-1', path: 123 }),
      );
      messageHandler('mockstate:updated', 'not-a-json');

      expect(received).toHaveLength(0);
      subscription.unsubscribe();
    });
  });

  describe('onModuleDestroy', () => {
    it('subscriber 커넥션을 종료한다', async () => {
      await service.onModuleInit();
      await service.onModuleDestroy();

      expect(mockSubscriber.quit).toHaveBeenCalledTimes(1);
    });
  });
});
