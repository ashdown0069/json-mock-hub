import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Workspace } from '../database/schema/workspace.schema';
import { WorkspaceMembership } from '../database/schema/workspace-membership.schema';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

describe('DashboardController', () => {
  let controller: DashboardController;
  const mockService = {
    getStats: jest
      .fn()
      .mockResolvedValue({ totalRoutes: 1, requestVolume24h: 2 }),
    getLogs: jest.fn().mockResolvedValue({ data: [], meta: {} }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        { provide: DashboardService, useValue: mockService },
        {
          provide: getModelToken(Workspace.name),
          useValue: {},
        },
        {
          provide: getModelToken(WorkspaceMembership.name),
          useValue: {},
        },
      ],
    }).compile();
    controller = module.get(DashboardController);
  });

  it('getStats는 서비스 결과를 그대로 반환한다', async () => {
    await expect(controller.getStats('ws1')).resolves.toEqual({
      totalRoutes: 1,
      requestVolume24h: 2,
    });
  });

  it('getLogs는 page/limit 기본값 1, 20을 적용한다', async () => {
    await controller.getLogs('ws1', {});
    expect(mockService.getLogs).toHaveBeenCalledWith('ws1', 1, 20);
  });
});
