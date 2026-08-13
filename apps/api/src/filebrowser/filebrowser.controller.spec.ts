import { Test, TestingModule } from '@nestjs/testing';
import { MessageEvent } from '@nestjs/common';
import { of, Subject } from 'rxjs';
import { getModelToken } from '@nestjs/mongoose';
import { FilebrowserController } from './filebrowser.controller';
import { FilebrowserService } from './filebrowser.service';
import {
  FilebrowserEvent,
  FilebrowserEventService,
} from './filebrowser-event.service';
import { Workspace } from '../database/schema/workspace.schema';
import { WorkspaceMembership } from '../database/schema/workspace-membership.schema';
import { WorkspaceRole } from '../database/schema/workspace-role.schema';

describe('FilebrowserController', () => {
  let controller: FilebrowserController;

  const mockFilebrowserService = {
    getItems: jest.fn().mockResolvedValue([]),
    createItem: jest.fn().mockResolvedValue({}),
    moveItems: jest.fn().mockResolvedValue({}),
    renameItem: jest.fn().mockResolvedValue({}),
    updateItem: jest.fn().mockResolvedValue({}),
    deleteItems: jest.fn().mockResolvedValue({}),
  };

  const mockFilebrowserEventService = {
    subscribe: jest.fn(),
    publish: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockFilebrowserEventService.subscribe.mockReturnValue(of());

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FilebrowserController],
      providers: [
        {
          provide: FilebrowserService,
          useValue: mockFilebrowserService,
        },
        {
          provide: FilebrowserEventService,
          useValue: mockFilebrowserEventService,
        },
        {
          provide: getModelToken(Workspace.name),
          useValue: {},
        },
        {
          provide: getModelToken(WorkspaceMembership.name),
          useValue: {},
        },
        {
          provide: getModelToken(WorkspaceRole.name),
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<FilebrowserController>(FilebrowserController);
  });

  it('컨트롤러가 정의되어야 한다', () => {
    expect(controller).toBeDefined();
  });

  describe('subscribe (SSE)', () => {
    it('이벤트를 MessageEvent 형태로 매핑하여 방출한다', () => {
      const events$ = new Subject<FilebrowserEvent>();
      mockFilebrowserEventService.subscribe.mockReturnValue(events$);

      const received: MessageEvent[] = [];
      const subscription = controller
        .subscribe('ws-1')
        .subscribe((event) => received.push(event));

      events$.next({ workspaceId: 'ws-1', action: 'CREATE' });

      expect(received).toContainEqual({
        data: { action: 'CREATE', workspaceId: 'ws-1' },
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

  describe('mutation 엔드포인트의 이벤트 발행', () => {
    it('createItems는 CREATE 액션을 발행한다', async () => {
      await controller.createItems('ws-1', {} as any);

      expect(mockFilebrowserEventService.publish).toHaveBeenCalledWith({
        workspaceId: 'ws-1',
        action: 'CREATE',
      });
    });

    it('renameItem은 RENAME 액션을 발행한다 (MOVE 아님)', async () => {
      await controller.renameItem('ws-1', {} as any);

      expect(mockFilebrowserEventService.publish).toHaveBeenCalledWith({
        workspaceId: 'ws-1',
        action: 'RENAME',
      });
    });

    it('deleteItems는 DELETE 액션을 발행한다', async () => {
      await controller.deleteItems('ws-1', { itemIds: ['507f1f77bcf86cd799439011'] });

      expect(mockFilebrowserEventService.publish).toHaveBeenCalledWith({
        workspaceId: 'ws-1',
        action: 'DELETE',
      });
    });
  });
});
