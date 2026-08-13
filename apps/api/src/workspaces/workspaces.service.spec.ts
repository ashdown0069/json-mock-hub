import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { WorkspacesService } from './workspaces.service';
import { ApiKeyService } from './api-key.service';
import { TransactionService } from '../database/transaction.service';
import { Workspace } from '../database/schema/workspace.schema';
import { WorkspaceMembership } from '../database/schema/workspace-membership.schema';
import { WorkspaceRole } from '../database/schema/workspace-role.schema';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn().mockImplementation(async (pw: string) => `$2b$10$hashed_${pw}`),
}));

describe('WorkspacesService', () => {
  let service: WorkspacesService;

  const workspaceModel = { create: jest.fn(), findOne: jest.fn(), updateOne: jest.fn() };
  const membershipModel = { create: jest.fn(), findOne: jest.fn() };
  const roleModel = { create: jest.fn() };
  // 트랜잭션 mock: 가짜 세션을 콜백에 넘겨 즉시 실행 (쓰기 인자로 세션 전달을 검증)
  const FAKE_SESSION = {} as any;
  const transactionService = {
    withTransaction: jest.fn((cb: (session: unknown) => unknown) =>
      cb(FAKE_SESSION),
    ),
  };
  const apiKeyService = {
    generateKey: jest
      .fn()
      .mockReturnValue('mock_123456789012345678901234567890123456789012345678'),
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

  describe('멤버십 생성 시 API 키 자동 발급', () => {
    it('create: owner 멤버십에 API 키와 발급일을 함께 저장한다', async () => {
      workspaceModel.create.mockResolvedValue([
        { _id: new Types.ObjectId(), name: 'ws' },
      ]);
      membershipModel.create.mockResolvedValue([{}]);
      roleModel.create.mockResolvedValue([{}]);

      await service.create(
        {
          name: 'ws',
          description: 'd',
          password: 'pw1234!!',
          passwordConfirm: 'pw1234!!',
        } as never,
        new Types.ObjectId().toHexString(),
      );

      // membershipModel.create([{...}], { session }) 형태로 호출된다
      const created = membershipModel.create.mock.calls[0][0][0];
      expect(created.role).toBe('owner');
      expect(created.apiKey).toMatch(/^mock_[0-9a-f]{48}$/);
      expect(created.apiKeyIssuedAt).toBeInstanceOf(Date);
    });

    it('joinWorkspace: member 멤버십에도 API 키를 발급한다', async () => {
      // 멤버도 자기 키로 MCP를 쓸 수 있어야 한다는 것이 이번 변경의 목적이다
      const wsOid = new Types.ObjectId();
      workspaceModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: wsOid, password: 'hashed' }),
      });
      // 아직 멤버가 아닌 상태
      membershipModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      workspaceModel.updateOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({}),
      });

      await service.joinWorkspace(
        wsOid.toHexString(),
        new Types.ObjectId().toHexString(),
        'pw1234!!',
      );

      // 세션을 넘기려면 mongoose가 create([doc], options) 배열 형태를 요구한다
      const created = membershipModel.create.mock.calls[0][0][0];
      expect(created.role).toBe('member');
      expect(created.apiKey).toMatch(/^mock_[0-9a-f]{48}$/);
      expect(created.apiKeyIssuedAt).toBeInstanceOf(Date);
      expect(membershipModel.create.mock.calls[0][1]).toEqual({
        session: FAKE_SESSION,
      });
    });

    it('joinWorkspace: 멤버십 생성과 membersCount 증가를 한 트랜잭션으로 묶는다', async () => {
      // 두 쓰기가 분리돼 있으면 두 번째가 실패했을 때 멤버 수가 영구히 어긋나고
      // 이를 되돌릴 보정 경로가 없다.
      const wsOid = new Types.ObjectId();
      workspaceModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: wsOid, password: 'hashed' }),
      });
      membershipModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      membershipModel.create.mockResolvedValue([{}]);
      workspaceModel.updateOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({}),
      });

      await service.joinWorkspace(
        wsOid.toHexString(),
        new Types.ObjectId().toHexString(),
        'pw1234!!',
      );

      expect(transactionService.withTransaction).toHaveBeenCalled();
      expect(workspaceModel.updateOne).toHaveBeenCalledWith(
        { _id: wsOid },
        { $inc: { membersCount: 1 } },
        { session: FAKE_SESSION },
      );
    });
  });
});

describe('WorkspacesService.update — 갱신 가능 필드 화이트리스트', () => {
  const VALID_WS_ID = '507f1f77bcf86cd799439011';
  const USER_ID = '507f1f77bcf86cd799439012';

  const createService = () => {
    const exec = jest.fn().mockResolvedValue({ _id: VALID_WS_ID, name: 'w' });
    const findOneAndUpdate = jest.fn().mockReturnValue({ exec });
    const workspaceModel = { findOneAndUpdate } as any;

    // update()는 workspaceModel만 사용하므로 나머지 의존성은 빈 객체로 충분하다
    const service = new WorkspacesService(
      {} as any,
      {} as any,
      workspaceModel,
      {} as any,
      {} as any,
    );

    return { service, findOneAndUpdate };
  };

  it('name과 description만 갱신 문서에 담는다', async () => {
    const { service, findOneAndUpdate } = createService();

    await service.update(
      VALID_WS_ID,
      { name: '새 이름', description: '설명' } as any,
      USER_ID,
    );

    expect(findOneAndUpdate.mock.calls[0][1]).toEqual({
      name: '새 이름',
      description: '설명',
    });
  });

  it('owner/apiKey/isDeleted/membersCount가 섞여 들어와도 갱신 문서에 반영하지 않는다', async () => {
    const { service, findOneAndUpdate } = createService();

    await service.update(
      VALID_WS_ID,
      {
        name: 'w',
        owner: '507f1f77bcf86cd799439099',
        apiKey: 'mock_attacker',
        isDeleted: new Date(),
        membersCount: 9999,
      } as any,
      USER_ID,
    );

    expect(findOneAndUpdate.mock.calls[0][1]).toEqual({ name: 'w' });
  });

  it('password는 반드시 bcrypt 해시로 변환해서 담는다', async () => {
    const { service, findOneAndUpdate } = createService();

    await service.update(VALID_WS_ID, { password: 'plain1234' } as any, USER_ID);

    const update = findOneAndUpdate.mock.calls[0][1];
    expect(update.password).toBeDefined();
    expect(update.password).not.toBe('plain1234');
    expect(update.password.startsWith('$2')).toBe(true);
  });
});

describe('WorkspacesService.remove — 멤버십 및 키 무효화', () => {
  it('remove: 워크스페이스를 지우면 모든 멤버십이 함께 무효화되어 API 키도 죽는다', async () => {
    // ApiKeyService.verify()는 멤버십의 isDeleted만 본다. 이 updateMany가
    // 빠지면 삭제된 워크스페이스의 키로 계속 접근할 수 있게 된다.
    const wsOid = new Types.ObjectId();
    const ownerId = new Types.ObjectId().toHexString();

    const workspaceModel = {
      findOneAndUpdate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: wsOid }),
      }),
    } as any;
    const membershipModel = {
      updateMany: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({}),
      }),
    } as any;
    const transactionService = {
      withTransaction: jest.fn((cb: any) => cb(null)),
    } as any;

    const service = new WorkspacesService(
      transactionService,
      {} as any,
      workspaceModel,
      membershipModel,
      {} as any,
    );

    await service.remove(wsOid.toHexString(), ownerId);

    expect(membershipModel.updateMany).toHaveBeenCalledWith(
      { workspace: wsOid },
      expect.objectContaining({ isDeleted: expect.any(Date) }),
      expect.anything(),
    );
  });
});

