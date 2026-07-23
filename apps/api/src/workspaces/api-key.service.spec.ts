import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ApiKeyService } from './api-key.service';
import { Workspace } from '../database/schema/workspace.schema';

describe('ApiKeyService', () => {
  let service: ApiKeyService;
  const workspaceId = new Types.ObjectId().toHexString();

  const workspaceModel = {
    findOneAndUpdate: jest.fn(),
    findOne: jest.fn(),
  };

  // findOne().select('+apiKey').exec() 체이닝 mock
  const mockFindOneResult = (doc: unknown) => ({
    select: jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue(doc) }),
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyService,
        { provide: getModelToken(Workspace.name), useValue: workspaceModel },
      ],
    }).compile();

    service = module.get<ApiKeyService>(ApiKeyService);
  });

  it('generateKey: mock_ 접두사 + 48자리 hex 형식의 키를 만든다', () => {
    expect(service.generateKey()).toMatch(/^mock_[0-9a-f]{48}$/);
  });

  it('issue: 평문 키를 그대로 저장하고 응답으로도 반환한다', async () => {
    workspaceModel.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ _id: workspaceId }),
    });

    const result = await service.issue(workspaceId);

    expect(result.apiKey).toMatch(/^mock_[0-9a-f]{48}$/);
    const savedFields = workspaceModel.findOneAndUpdate.mock.calls[0][1];
    expect(savedFields.apiKey).toBe(result.apiKey);
    expect(savedFields.apiKeyIssuedAt).toBeInstanceOf(Date);
  });

  it('getKey: 저장된 평문 키와 발급일을 반환한다', async () => {
    const issuedAt = new Date('2026-07-01T00:00:00Z');
    workspaceModel.findOne.mockReturnValue(
      mockFindOneResult({
        apiKey: 'mock_stored_key',
        apiKeyIssuedAt: issuedAt,
      }),
    );

    await expect(service.getKey(workspaceId)).resolves.toEqual({
      apiKey: 'mock_stored_key',
      issuedAt,
    });
  });

  it('getKey: 키가 없는 워크스페이스(자동 발급 도입 전 생성)면 즉석 발급해 반환한다', async () => {
    // 영속 DB(Atlas)에 남은 레거시 데이터 대응 — 조회 시점에 발급해 "키 없는 상태 없음" 불변식을 복구한다
    workspaceModel.findOne.mockReturnValue(
      mockFindOneResult({ apiKey: null, apiKeyIssuedAt: null }),
    );
    workspaceModel.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ _id: workspaceId }),
    });

    const result = await service.getKey(workspaceId);

    expect(result.apiKey).toMatch(/^mock_[0-9a-f]{48}$/);
    expect(workspaceModel.findOneAndUpdate).toHaveBeenCalled();
  });

  it('verify: 올바른 키면 워크스페이스 문서를 반환한다', async () => {
    const doc = { owner: new Types.ObjectId(), apiKey: 'mock_valid_key' };
    workspaceModel.findOne.mockReturnValue(mockFindOneResult(doc));

    await expect(service.verify(workspaceId, 'mock_valid_key')).resolves.toBe(
      doc,
    );
  });

  it('verify: 키가 일치하지 않으면 UnauthorizedException을 던진다', async () => {
    workspaceModel.findOne.mockReturnValue(
      mockFindOneResult({ apiKey: 'mock_other_key!' }),
    );

    await expect(
      service.verify(workspaceId, 'mock_wrong_key99'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('verify: 키 미보유 워크스페이스면 UnauthorizedException을 던진다', async () => {
    workspaceModel.findOne.mockReturnValue(mockFindOneResult({ apiKey: null }));

    await expect(
      service.verify(workspaceId, 'mock_any'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('verify: workspaceId가 유효하지 않으면 UnauthorizedException을 던진다', async () => {
    await expect(service.verify(undefined, 'mock_any')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
