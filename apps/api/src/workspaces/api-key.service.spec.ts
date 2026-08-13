import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  ForbiddenException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { ApiKeyService } from './api-key.service';
import { WorkspaceMembership } from '../database/schema/workspace-membership.schema';

describe('ApiKeyService', () => {
  let service: ApiKeyService;
  const workspaceId = new Types.ObjectId().toHexString();
  const userId = new Types.ObjectId().toHexString();

  const membershipModel = {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
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
        {
          provide: getModelToken(WorkspaceMembership.name),
          useValue: membershipModel,
        },
      ],
    }).compile();

    service = module.get<ApiKeyService>(ApiKeyService);
  });

  it('generateKey: mock_ 접두사 + 48자리 hex 형식의 키를 만든다', () => {
    expect(service.generateKey()).toMatch(/^mock_[0-9a-f]{48}$/);
  });

  it('getMyKey: 내 멤버십에 저장된 평문 키와 발급일을 반환한다', async () => {
    const issuedAt = new Date('2026-07-01T00:00:00Z');
    membershipModel.findOne.mockReturnValue(
      mockFindOneResult({ apiKey: 'mock_stored_key', apiKeyIssuedAt: issuedAt }),
    );

    await expect(service.getMyKey(workspaceId, userId)).resolves.toEqual({
      apiKey: 'mock_stored_key',
      issuedAt,
    });
  });

  it('getMyKey: 멤버가 아니면 ForbiddenException을 던진다', async () => {
    membershipModel.findOne.mockReturnValue(mockFindOneResult(null));

    await expect(
      service.getMyKey(workspaceId, userId),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('getMyKey: 키 없는 활성 멤버십이면 불변식 위반이므로 500을 던진다', async () => {
    // 지연 발급 폴백을 두지 않는다. 조용히 null을 흘리면 web이 빈 키로
    // 설치 명령을 만들어 원인 파악이 어려운 401로 번진다.
    membershipModel.findOne.mockReturnValue(
      mockFindOneResult({ apiKey: null, apiKeyIssuedAt: null }),
    );

    await expect(
      service.getMyKey(workspaceId, userId),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it('reissueMyKey: 내 멤버십의 키만 교체하고 새 키를 반환한다', async () => {
    membershipModel.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ _id: new Types.ObjectId() }),
    });

    const result = await service.reissueMyKey(workspaceId, userId);

    expect(result.apiKey).toMatch(/^mock_[0-9a-f]{48}$/);

    // 다른 멤버가 영향받지 않도록 user 조건이 반드시 걸려야 한다
    const filter = membershipModel.findOneAndUpdate.mock.calls[0][0];
    expect(filter.user).toEqual(new Types.ObjectId(userId));
    expect(filter.isDeleted).toBeNull();

    const update = membershipModel.findOneAndUpdate.mock.calls[0][1];
    expect(update.apiKey).toBe(result.apiKey);
    expect(update.apiKeyIssuedAt).toBeInstanceOf(Date);
  });

  it('reissueMyKey: 멤버가 아니면 ForbiddenException을 던진다', async () => {
    membershipModel.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    await expect(
      service.reissueMyKey(workspaceId, userId),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('verify: 올바른 키면 키 주인의 멤버십 문서를 반환한다', async () => {
    const doc = { user: new Types.ObjectId(), role: 'member' };
    membershipModel.findOne.mockReturnValue(mockFindOneResult(doc));

    await expect(service.verify(workspaceId, 'mock_valid_key')).resolves.toBe(
      doc,
    );
  });

  it('verify: 추방된 멤버의 키는 조회되지 않도록 isDeleted 조건을 건다', async () => {
    // 이 조건이 빠지면 추방된 멤버의 키가 계속 동작한다
    membershipModel.findOne.mockReturnValue(mockFindOneResult(null));

    await expect(
      service.verify(workspaceId, 'mock_any'),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(membershipModel.findOne.mock.calls[0][0].isDeleted).toBeNull();
  });

  it('verify: 타 워크스페이스 키가 섞이지 않도록 workspace 조건을 건다', async () => {
    membershipModel.findOne.mockReturnValue(mockFindOneResult(null));

    await expect(
      service.verify(workspaceId, 'mock_any'),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(membershipModel.findOne.mock.calls[0][0].workspace).toEqual(
      new Types.ObjectId(workspaceId),
    );
  });

  it('verify: workspaceId가 유효하지 않으면 UnauthorizedException을 던진다', async () => {
    await expect(service.verify(undefined, 'mock_any')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
