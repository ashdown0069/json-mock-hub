import { Test, TestingModule } from '@nestjs/testing';
import { WorkspacesController } from './workspaces.controller';
import { WorkspacesService } from './workspaces.service';
import { ApiKeyService } from './api-key.service';
import { WorkspaceOwnerGuard } from './guards/workspace-owner.guard';
import { WorkspaceMemberGuard } from './guards/workspace-member.guard';

describe('WorkspacesController', () => {
  let controller: WorkspacesController;

  const apiKeyService = {
    getMyKey: jest.fn(),
    reissueMyKey: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkspacesController],
      providers: [
        { provide: WorkspacesService, useValue: {} },
        { provide: ApiKeyService, useValue: apiKeyService },
      ],
    })
      .overrideGuard(WorkspaceOwnerGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(WorkspaceMemberGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<WorkspacesController>(WorkspacesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
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
