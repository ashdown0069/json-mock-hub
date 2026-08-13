import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, HttpException, HttpStatus } from '@nestjs/common';
import { Types } from 'mongoose';
import { MockserverController } from './mockserver.controller';
import { MockserverService } from './mockserver.service';
import { RequestLogService } from './request-log.service';
import { MockWriteThrottlerGuard } from './mock-write-throttler.guard';

describe('MockserverController 요청 로깅', () => {
  let controller: MockserverController;
  const mockService = { resolveRequest: jest.fn() };
  const mockLog = { record: jest.fn() };
  const workspaceId = new Types.ObjectId().toHexString();
  const makeReq = (host: string, path = '/api/users', method = 'GET') =>
    ({
      headers: { 'x-forwarded-host': host },
      hostname: host,
      path,
      method,
      ip: '10.0.0.1',
    }) as any;
  const res = { status: jest.fn(), type: jest.fn() } as any;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [MockserverController],
      providers: [
        { provide: MockserverService, useValue: mockService },
        { provide: RequestLogService, useValue: mockLog },
        { provide: ConfigService, useValue: { get: () => 'localhost:3000' } },
      ],
    })
      .overrideGuard(MockWriteThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = module.get(MockserverController);
  });

  it('성공 응답 시 상태코드와 함께 로그를 남긴다', async () => {
    mockService.resolveRequest.mockResolvedValue({ status: 200, body: [] });
    await controller.handleAll(
      makeReq(`${workspaceId}.localhost:3000`),
      {},
      undefined,
      res,
    );
    expect(mockLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId,
        method: 'GET',
        path: '/users', // normalizeMockPath 적용 결과
        status: 200,
        ip: '10.0.0.1',
      }),
    );
  });

  it('존재하지 않는 라우트(404)도 로그를 남긴 뒤 예외를 전파한다', async () => {
    mockService.resolveRequest.mockRejectedValue(new NotFoundException());
    await expect(
      controller.handleAll(
        makeReq(`${workspaceId}.localhost:3000`),
        {},
        undefined,
        res,
      ),
    ).rejects.toThrow(NotFoundException);
    expect(mockLog.record).toHaveBeenCalledWith(
      expect.objectContaining({ status: 404 }),
    );
  });

  it('유효하지 않은 ObjectId 서브도메인이면 404를 던지고 로그를 남기지 않는다', async () => {
    await expect(
      controller.handleAll(makeReq('abc.localhost:3000'), {}, undefined, res),
    ).rejects.toThrow(HttpException);
    expect(mockLog.record).not.toHaveBeenCalled();
    expect(mockService.resolveRequest).not.toHaveBeenCalled();
  });

  it('x-forwarded-host가 배열(다단 프록시)이어도 workspaceId를 추출한다', async () => {
    mockService.resolveRequest.mockResolvedValue({ status: 200, body: [] });
    const req = {
      headers: {
        'x-forwarded-host': [`${workspaceId}.localhost:3000`, 'edge-proxy'],
      },
      hostname: 'edge-proxy',
      path: '/api/users',
      method: 'GET',
      ip: '10.0.0.1',
    } as any;

    await controller.handleAll(req, {}, undefined, res);

    expect(mockService.resolveRequest).toHaveBeenCalledWith(
      workspaceId,
      '/api/users',
      'GET',
      {},
      undefined,
    );
  });
});

describe('MockserverController 응답 MIME', () => {
  let controller: MockserverController;
  const mockService = { resolveRequest: jest.fn() };
  const mockLog = { record: jest.fn() };
  const workspaceId = new Types.ObjectId().toHexString();
  const res = { status: jest.fn(), type: jest.fn() } as any;
  const makeReq = () =>
    ({
      headers: { 'x-forwarded-host': `${workspaceId}.localhost:3000` },
      hostname: `${workspaceId}.localhost:3000`,
      path: '/api/users',
      method: 'GET',
      ip: '10.0.0.1',
    }) as any;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [MockserverController],
      providers: [
        { provide: MockserverService, useValue: mockService },
        { provide: RequestLogService, useValue: mockLog },
        { provide: ConfigService, useValue: { get: () => 'localhost:3000' } },
      ],
    })
      .overrideGuard(MockWriteThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = module.get(MockserverController);
  });

  it('mock 응답을 항상 application/json으로 강제한다 (문자열 원소의 저장형 XSS 차단)', async () => {
    // item.json 원소가 문자열이면 express가 Content-Type을 text/html로 추론한다
    mockService.resolveRequest.mockResolvedValue({
      status: 200,
      body: ['<img src=x onerror=alert(1)>'],
    });

    await controller.handleAll(makeReq(), {}, undefined, res);

    expect(res.type).toHaveBeenCalledWith('application/json');
  });

  it('객체 배열 응답에도 동일하게 적용한다', async () => {
    mockService.resolveRequest.mockResolvedValue({
      status: 200,
      body: [{ id: 1 }],
    });

    await controller.handleAll(makeReq(), {}, undefined, res);

    expect(res.type).toHaveBeenCalledWith('application/json');
  });
});
