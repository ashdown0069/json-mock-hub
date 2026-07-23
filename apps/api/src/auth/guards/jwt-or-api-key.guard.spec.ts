import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtOrApiKeyGuard } from './jwt-or-api-key.guard';
import { ApiKeyService } from '../../workspaces/api-key.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Test, TestingModule } from '@nestjs/testing';

describe('JwtOrApiKeyGuard', () => {
  let guard: JwtOrApiKeyGuard;
  let apiKeyService: ApiKeyService;

  const mockApiKeyService = {
    verify: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtOrApiKeyGuard,
        {
          provide: ApiKeyService,
          useValue: mockApiKeyService,
        },
      ],
    }).compile();

    guard = module.get<JwtOrApiKeyGuard>(JwtOrApiKeyGuard);
    apiKeyService = module.get<ApiKeyService>(ApiKeyService);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    let mockContext: any;
    let mockRequest: any;

    beforeEach(() => {
      mockRequest = {
        headers: {},
        params: {},
      };
      mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      };
    });

    it('X-API-Key 헤더가 있는 경우 ApiKeyService.verify를 호출하고 성공 시 user 정보를 설정한 뒤 true를 리턴한다', async () => {
      mockRequest.headers['x-api-key'] = 'mock_key_123';
      mockRequest.params.workspaceId = 'workspace_123';

      const mockWorkspace = {
        owner: 'owner_user_id',
      };
      mockApiKeyService.verify.mockResolvedValue(mockWorkspace);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockApiKeyService.verify).toHaveBeenCalledWith(
        'workspace_123',
        'mock_key_123',
      );
      expect(mockRequest.user).toEqual({
        sub: 'owner_user_id',
        viaApiKey: true,
      });
    });

    it('X-API-Key 헤더가 있는 경우 ApiKeyService.verify가 실패하면 에러를 던진다', async () => {
      mockRequest.headers['x-api-key'] = 'mock_key_invalid';
      mockRequest.params.workspaceId = 'workspace_123';

      mockApiKeyService.verify.mockRejectedValue(new UnauthorizedException());

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('X-API-Key 헤더가 없는 경우 super.canActivate를 호출한다', async () => {
      const superCanActivateSpy = jest
        .spyOn(JwtAuthGuard.prototype, 'canActivate')
        .mockImplementation(() => true);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(superCanActivateSpy).toHaveBeenCalledWith(mockContext);

      superCanActivateSpy.mockRestore();
    });
  });
});
