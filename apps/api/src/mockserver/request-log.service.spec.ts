import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { RequestLog } from 'src/database/schema/request-log.schema';
import { RequestLogService } from './request-log.service';

describe('RequestLogService', () => {
  let service: RequestLogService;
  const mockModel = { create: jest.fn().mockResolvedValue(undefined) };
  const validId = new Types.ObjectId().toHexString();

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        RequestLogService,
        { provide: getModelToken(RequestLog.name), useValue: mockModel },
      ],
    }).compile();
    service = module.get(RequestLogService);
  });

  it('허용 메소드 요청을 workspace ObjectId로 캐스팅해 저장한다', () => {
    service.record({
      workspaceId: validId,
      method: 'get',
      path: '/users',
      status: 200,
      ip: '1.2.3.4',
    });
    expect(mockModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        path: '/users',
        status: 200,
        ip: '1.2.3.4',
      }),
    );
    expect(mockModel.create.mock.calls[0][0].workspace).toBeInstanceOf(
      Types.ObjectId,
    );
  });

  it('허용되지 않은 메소드(HEAD)는 저장하지 않는다', () => {
    service.record({
      workspaceId: validId,
      method: 'HEAD',
      path: '/',
      status: 200,
    });
    expect(mockModel.create).not.toHaveBeenCalled();
  });

  it('유효하지 않은 ObjectId면 저장하지 않는다', () => {
    service.record({
      workspaceId: 'not-an-oid',
      method: 'GET',
      path: '/',
      status: 200,
    });
    expect(mockModel.create).not.toHaveBeenCalled();
  });

  it('저장 실패 시 예외를 전파하지 않는다', () => {
    mockModel.create.mockRejectedValueOnce(new Error('db down'));
    expect(() =>
      service.record({
        workspaceId: validId,
        method: 'GET',
        path: '/',
        status: 200,
      }),
    ).not.toThrow();
  });
});
