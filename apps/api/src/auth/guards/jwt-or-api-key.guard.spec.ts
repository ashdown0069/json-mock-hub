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

    it('X-API-Key 헤더가 있으면 verify를 호출하고 키 주인을 sub로 설정한 뒤 true를 리턴한다', async () => {
      // owner 대행을 걷어낸 지점. sub가 키 주인이어야 WorkspacePermissionGuard가
      // 그 사람의 실제 role로 세분 권한을 판정한다.
      mockRequest.headers['x-api-key'] = 'mock_key_123';
      mockRequest.params.workspaceId = 'workspace_123';

      const mockMembership = {
        user: 'member_user_id',
        role: 'member',
      };
      mockApiKeyService.verify.mockResolvedValue(mockMembership);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockApiKeyService.verify).toHaveBeenCalledWith(
        'workspace_123',
        'mock_key_123',
      );
      expect(mockRequest.user).toEqual({
        sub: 'member_user_id',
        viaApiKey: true,
        apiKeyWorkspaceId: 'workspace_123',
      });
    });

    it('멤버십의 user가 ObjectId여도 문자열 sub로 변환한다', async () => {
      // populate하지 않으면 user는 ObjectId다. String()으로 감싸지 않으면
      // 이후 Types.ObjectId(sub) 변환이 깨진다.
      mockRequest.headers['x-api-key'] = 'mock_key_123';
      mockRequest.params.workspaceId = 'workspace_123';

      const objectIdLike = { toString: () => '507f1f77bcf86cd799439011' };
      mockApiKeyService.verify.mockResolvedValue({ user: objectIdLike });

      await guard.canActivate(mockContext);

      expect(mockRequest.user.sub).toBe('507f1f77bcf86cd799439011');
      expect(typeof mockRequest.user.sub).toBe('string');
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
