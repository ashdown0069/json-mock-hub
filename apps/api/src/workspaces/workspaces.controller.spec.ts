import { Test, TestingModule } from '@nestjs/testing';
import { WorkspacesController } from './workspaces.controller';
import { WorkspacesService } from './workspaces.service';
import { ApiKeyService } from './api-key.service';
import { WorkspaceAccessGuard } from './guards/workspace-access.guard';
import { REQUIRE_OWNER_KEY } from './guards/require-owner.decorator';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';

describe('WorkspacesController', () => {
  let controller: WorkspacesController;
  const reflector = new Reflector();

  const workspacesService = {
    update: jest.fn(),
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    joinWorkspace: jest.fn(),
    checkMembership: jest.fn(),
  };

  const apiKeyService = {
    getMyKey: jest.fn(),
    reissueMyKey: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkspacesController],
      providers: [
        { provide: WorkspacesService, useValue: workspacesService },
        { provide: ApiKeyService, useValue: apiKeyService },
      ],
    })
      .overrideGuard(WorkspaceAccessGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<WorkspacesController>(WorkspacesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('update: @RequireOwner 및 WorkspaceAccessGuard 메타데이터가 적용되어 있어야 한다', () => {
    const isRequireOwner = reflector.get<boolean>(
      REQUIRE_OWNER_KEY,
      controller.update,
    );
    const guards = reflector.get<any[]>(
      GUARDS_METADATA,
      controller.update,
    );

    expect(isRequireOwner).toBe(true);
    expect(guards).toBeDefined();
    expect(guards).toContain(WorkspaceAccessGuard);
  });

  it('update: 워크스페이스 수정을 요청자 ID와 함께 서비스에 위임한다', async () => {
    const mockUpdated = { _id: 'ws-1', name: '수정된 이름' };
    workspacesService.update.mockResolvedValue(mockUpdated);

    const dto = { name: '수정된 이름' };
    const result = await controller.update('ws-1', dto as any, 'user-1');

    expect(result).toBe(mockUpdated);
    expect(workspacesService.update).toHaveBeenCalledWith('ws-1', dto, 'user-1');
  });

  it('findOne: WorkspaceAccessGuard 메타데이터가 적용되어 있어야 한다', () => {
    const guards = reflector.get<any[]>(
      GUARDS_METADATA,
      controller.findOne,
    );

    expect(guards).toBeDefined();
    expect(guards).toContain(WorkspaceAccessGuard);
  });

  it('findOne: 워크스페이스 조회를 요청자 ID와 함께 서비스에 위임한다', async () => {
    const mockWorkspace = { _id: 'ws-1', name: '테스트 워크스페이스' };
    workspacesService.findOne.mockResolvedValue(mockWorkspace);

    const result = await controller.findOne('ws-1', 'user-1');

    expect(result).toBe(mockWorkspace);
    expect(workspacesService.findOne).toHaveBeenCalledWith('ws-1', 'user-1');
  });

  it('getMyApiKey: 요청자 본인의 키를 조회한다', async () => {
    const expected = { apiKey: 'mock_key', issuedAt: new Date() };
    apiKeyService.getMyKey.mockResolvedValue(expected);

    await expect(
      controller.getMyApiKey('ws-1', 'user-1'),
    ).resolves.toBe(expected);
    expect(apiKeyService.getMyKey).toHaveBeenCalledWith('ws-1', 'user-1');
  });

  it('reissueMyApiKey: 요청자 본인의 키만 재발급한다', async () => {
    const expected = { apiKey: 'mock_new', issuedAt: new Date() };
    apiKeyService.reissueMyKey.mockResolvedValue(expected);

    await expect(
      controller.reissueMyApiKey('ws-1', 'user-1'),
    ).resolves.toBe(expected);
    expect(apiKeyService.reissueMyKey).toHaveBeenCalledWith('ws-1', 'user-1');
  });

  it('폐기(DELETE) 핸들러는 더 이상 존재하지 않는다', () => {
    expect(
      (controller as unknown as Record<string, unknown>).revokeApiKey,
    ).toBeUndefined();
  });
});
