import { Test, TestingModule } from '@nestjs/testing';
import { MessageEvent } from '@nestjs/common';
import { Subject } from 'rxjs';
import { getModelToken } from '@nestjs/mongoose';
import { MockStateController } from './mock-state.controller';
import { MockStateService } from './mock-state.service';
import { MockStateEvent, MockStateEventService } from './mock-state-event.service';
import { Workspace } from '../database/schema/workspace.schema';
import { WorkspaceMembership } from '../database/schema/workspace-membership.schema';
import { WorkspaceRole } from '../database/schema/workspace-role.schema';

describe('MockStateController', () => {
  let controller: MockStateController;

  const mockMockStateService = {
    getEffectiveJson: jest.fn().mockResolvedValue([{ id: 1 }]),
  };

  const mockMockStateEvent = {
    subscribe: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockMockStateService.getEffectiveJson.mockResolvedValue([{ id: 1 }]);
    mockMockStateEvent.subscribe.mockReturnValue(new Subject<MockStateEvent>());

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MockStateController],
      providers: [
        { provide: MockStateService, useValue: mockMockStateService },
        { provide: MockStateEventService, useValue: mockMockStateEvent },
        { provide: getModelToken(Workspace.name), useValue: {} },
        { provide: getModelToken(WorkspaceMembership.name), useValue: {} },
        { provide: getModelToken(WorkspaceRole.name), useValue: {} },
      ],
    }).compile();

    controller = module.get<MockStateController>(MockStateController);
  });

  it('컨트롤러가 정의되어야 한다', () => {
    expect(controller).toBeDefined();
  });

  describe('subscribe (SSE)', () => {
    it('이벤트를 MessageEvent 형태로 매핑하여 방출한다', () => {
      const events$ = new Subject<MockStateEvent>();
      mockMockStateEvent.subscribe.mockReturnValue(events$);

      const received: MessageEvent[] = [];
      const subscription = controller
        .subscribe('ws-1')
        .subscribe((event) => received.push(event));

      events$.next({ workspaceId: 'ws-1', path: '/users' });

      expect(received).toContainEqual({
        data: { workspaceId: 'ws-1', path: '/users' },
      });
      subscription.unsubscribe();
    });

    it('프록시 타임아웃 방지를 위해 25초마다 heartbeat 이벤트를 방출한다', () => {
      jest.useFakeTimers();
      try {
        const received: MessageEvent[] = [];
        const subscription = controller
          .subscribe('ws-1')
          .subscribe((event) => received.push(event));

        jest.advanceTimersByTime(25_000);

        expect(received).toContainEqual({ type: 'heartbeat', data: '' });
        subscription.unsubscribe();
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('getEffective', () => {
    it('workspaceId와 path를 그대로 서비스에 위임한다', async () => {
      const result = await controller.getEffective('ws-1', '/users');

      expect(mockMockStateService.getEffectiveJson).toHaveBeenCalledWith(
        'ws-1',
        '/users',
      );
      expect(result).toEqual([{ id: 1 }]);
    });
  });
});
