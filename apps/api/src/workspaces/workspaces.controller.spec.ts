import { Test, TestingModule } from '@nestjs/testing';
import { WorkspacesController } from './workspaces.controller';
import { WorkspacesService } from './workspaces.service';
import { ApiKeyService } from './api-key.service';
import { WorkspaceOwnerGuard } from './guards/workspace-owner.guard';
import { WorkspaceMemberGuard } from './guards/workspace-member.guard';

describe('WorkspacesController', () => {
  let controller: WorkspacesController;

  const apiKeyService = {
    getKey: jest.fn(),
    issue: jest.fn(),
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

  it('getApiKey: ApiKeyService.getKey에 위임한다', async () => {
    const payload = { apiKey: 'mock_key', issuedAt: new Date() };
    apiKeyService.getKey.mockResolvedValue(payload);

    await expect(controller.getApiKey('ws-1')).resolves.toBe(payload);
    expect(apiKeyService.getKey).toHaveBeenCalledWith('ws-1');
  });

  it('reissueApiKey: ApiKeyService.issue에 위임한다', async () => {
    const payload = { apiKey: 'mock_new_key', issuedAt: new Date() };
    apiKeyService.issue.mockResolvedValue(payload);

    await expect(controller.reissueApiKey('ws-1')).resolves.toBe(payload);
    expect(apiKeyService.issue).toHaveBeenCalledWith('ws-1');
  });

  it('폐기(DELETE) 핸들러는 더 이상 존재하지 않는다', () => {
    expect(
      (controller as unknown as Record<string, unknown>).revokeApiKey,
    ).toBeUndefined();
  });
});
