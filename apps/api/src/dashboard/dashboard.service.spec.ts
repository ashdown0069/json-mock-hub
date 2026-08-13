import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { FileBrowserItem } from 'src/database/schema/file-browser-item.schema';
import { RequestLog } from 'src/database/schema/request-log.schema';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let service: DashboardService;
  const workspaceId = new Types.ObjectId().toHexString();

  const itemModel = {
    countDocuments: jest
      .fn()
      .mockReturnValue({ exec: () => Promise.resolve(3) }),
  };
  const logModel = {
    countDocuments: jest
      .fn()
      .mockReturnValue({ exec: () => Promise.resolve(42) }),
    find: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: getModelToken(FileBrowserItem.name), useValue: itemModel },
        { provide: getModelToken(RequestLog.name), useValue: logModel },
      ],
    }).compile();
    service = module.get(DashboardService);
  });

  it('getStats는 File 타입 개수와 24시간 이내 로그 수를 함께 반환한다', async () => {
    const stats = await service.getStats(workspaceId);
    expect(stats).toEqual({ totalRoutes: 3, requestVolume24h: 42 });
    expect(itemModel.countDocuments).toHaveBeenCalledWith(
      expect.objectContaining({ itemType: 'File' }),
    );
    expect(logModel.countDocuments).toHaveBeenCalledWith(
      expect.objectContaining({ createdAt: { $gte: expect.any(Date) } }),
    );
  });

  it('getLogs는 최신순 정렬과 skip/limit, meta를 계산한다', async () => {
    const result = await service.getLogs(workspaceId, 2, 20);
    const [firstResult] = logModel.find.mock.results;
    if (!firstResult) {
      throw new Error('logModel.find가 호출되지 않았습니다.');
    }
    const chain = firstResult.value;
    expect(chain.sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(chain.skip).toHaveBeenCalledWith(20);
    expect(chain.limit).toHaveBeenCalledWith(20);
    expect(result.meta).toEqual({
      page: 2,
      limit: 20,
      totalItems: 42,
      totalPages: 3,
      hasNext: true,
      hasPrev: true,
    });
  });

  it('로그가 없어도 totalPages는 최소 1이다', async () => {
    logModel.countDocuments.mockReturnValueOnce({
      exec: () => Promise.resolve(0),
    });
    const result = await service.getLogs(workspaceId, 1, 20);
    expect(result.meta.totalPages).toBe(1);
    expect(result.meta.hasNext).toBe(false);
  });
});
