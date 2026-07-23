import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { WorkspacesService } from './workspaces.service';
import { ApiKeyService } from './api-key.service';
import { TransactionService } from '../database/transaction.service';
import { Workspace } from '../database/schema/workspace.schema';
import { WorkspaceMembership } from '../database/schema/workspace-membership.schema';
import { WorkspaceRole } from '../database/schema/workspace-role.schema';

describe('WorkspacesService', () => {
  let service: WorkspacesService;

  const workspaceModel = { create: jest.fn() };
  const membershipModel = { create: jest.fn() };
  const roleModel = { create: jest.fn() };
  // 트랜잭션 mock: 콜백을 세션 없이 즉시 실행
  const transactionService = {
    withTransaction: jest.fn((cb: (session: unknown) => unknown) => cb(null)),
  };
  const apiKeyService = {
    generateKey: jest.fn().mockReturnValue('mock_generated_key_for_test'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspacesService,
        { provide: TransactionService, useValue: transactionService },
        { provide: ApiKeyService, useValue: apiKeyService },
        { provide: getModelToken(Workspace.name), useValue: workspaceModel },
        {
          provide: getModelToken(WorkspaceMembership.name),
          useValue: membershipModel,
        },
        { provide: getModelToken(WorkspaceRole.name), useValue: roleModel },
      ],
    }).compile();

    service = module.get<WorkspacesService>(WorkspacesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('create: 워크스페이스 생성 시 API 키가 무조건 함께 발급된다', async () => {
    const userId = new Types.ObjectId().toHexString();
    workspaceModel.create.mockResolvedValue([
      { _id: new Types.ObjectId(), name: 'ws' },
    ]);
    membershipModel.create.mockResolvedValue([{}]);
    roleModel.create.mockResolvedValue([{}]);

    await service.create(
      { name: 'ws', description: 'desc', password: 'pw1234' } as never,
      userId,
    );

    // workspaceModel.create의 첫 번째 인자(문서 배열)에 평문 키와 발급일이 포함되어야 한다
    const createdDoc = workspaceModel.create.mock.calls[0][0][0];
    expect(createdDoc.apiKey).toBe('mock_generated_key_for_test');
    expect(createdDoc.apiKeyIssuedAt).toBeInstanceOf(Date);
    expect(apiKeyService.generateKey).toHaveBeenCalledTimes(1);
  });
});
