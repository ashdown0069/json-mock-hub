import { ForbiddenException } from '@nestjs/common';
import { WorkspaceAccessGuard } from './workspace-access.guard';
import * as accessUtil from './workspace-access.util';

const WS_ID = '507f1f77bcf86cd799439011';
const OTHER_WS_ID = '507f1f77bcf86cd799439099';

describe('WorkspaceAccessGuard', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  // --- 헬퍼 ---

  const mockResolveMembership = (role: 'owner' | 'member') =>
    jest.spyOn(accessUtil, 'resolveMembershipOrThrow').mockResolvedValue({
      workspaceObjectId: WS_ID as any,
      role,
    });

  const createGuard = (
    reflectorOverrides: Record<string, unknown> = {},
    roleDocOverride: Record<string, boolean> | null = null,
  ) => {
    const reflector = {
      getAllAndOverride: jest.fn((key: string) => reflectorOverrides[key]),
    } as any;

    const roleModel = {
      findOne: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(roleDocOverride),
      }),
    } as any;

    return {
      guard: new WorkspaceAccessGuard(
        reflector,
        {} as any,
        {} as any,
        roleModel,
      ),
      roleModel,
    };
  };

  const createContext = (
    user: Record<string, unknown> = { sub: 'u1' },
    workspaceId = WS_ID,
  ) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ params: { workspaceId }, user }),
      }),
      getHandler: () => undefined,
      getClass: () => undefined,
    }) as any;

  // --- 멤버십 검증 (기존 WorkspaceMemberGuard 대체) ---

  describe('멤버십 검증', () => {
    it.each(['owner', 'member'] as const)(
      '%s 역할은 데코레이터 없이 통과한다',
      async (role) => {
        mockResolveMembership(role);
        const { guard } = createGuard();

        await expect(guard.canActivate(createContext())).resolves.toBe(true);
      },
    );

    it('비멤버는 resolveMembershipOrThrow가 던진 예외를 그대로 전파한다', async () => {
      jest
        .spyOn(accessUtil, 'resolveMembershipOrThrow')
        .mockRejectedValue(new ForbiddenException('not member'));
      const { guard } = createGuard();

      await expect(guard.canActivate(createContext())).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });

  // --- 소유자 전용 검사 (기존 WorkspaceOwnerGuard 대체) ---

  describe('@RequireOwner 검사', () => {
    it('owner는 @RequireOwner가 있어도 통과한다', async () => {
      mockResolveMembership('owner');
      const { guard } = createGuard({
        'workspace:require-owner': true,
      });

      await expect(guard.canActivate(createContext())).resolves.toBe(true);
    });

    it('member는 @RequireOwner가 있으면 workspace.access.owner_only로 거부한다', async () => {
      mockResolveMembership('member');
      const { guard } = createGuard({
        'workspace:require-owner': true,
      });

      const error = await guard
        .canActivate(createContext())
        .catch((e: ForbiddenException) => e);

      expect(error).toBeInstanceOf(ForbiddenException);
      expect((error as ForbiddenException).getResponse()).toMatchObject({
        code: 'workspace.access.owner_only',
      });
    });
  });

  // --- API 키 스코프 검사 (기존 WorkspacePermissionGuard 이관) ---

  describe('API 키 스코프 검사', () => {
    it('발급 워크스페이스와 일치하는 API 키는 통과한다', async () => {
      mockResolveMembership('owner');
      const { guard } = createGuard();

      await expect(
        guard.canActivate(
          createContext({
            sub: 'owner1',
            viaApiKey: true,
            apiKeyWorkspaceId: WS_ID,
          }),
        ),
      ).resolves.toBe(true);
    });

    it('다른 워크스페이스로 발급된 API 키는 거부한다', async () => {
      mockResolveMembership('owner');
      const { guard } = createGuard();

      await expect(
        guard.canActivate(
          createContext({
            sub: 'owner1',
            viaApiKey: true,
            apiKeyWorkspaceId: OTHER_WS_ID,
          }),
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  // --- 세부 권한 검사 (기존 WorkspacePermissionGuard 이관) ---

  describe('@RequirePermission 검사', () => {
    it('member에게 canDelete가 꺼져 있으면 거부한다', async () => {
      mockResolveMembership('member');
      const { guard } = createGuard(
        { 'workspace:require-permission': 'canDelete' },
        { canDelete: false },
      );

      await expect(guard.canActivate(createContext())).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('owner는 @RequirePermission이 있어도 세부 권한 검사 없이 통과한다', async () => {
      mockResolveMembership('owner');
      const { guard, roleModel } = createGuard({
        'workspace:require-permission': 'canDelete',
      });

      await expect(guard.canActivate(createContext())).resolves.toBe(true);
      expect(roleModel.findOne).not.toHaveBeenCalled();
    });

    it('member에게 canCreate가 켜져 있으면 통과한다', async () => {
      mockResolveMembership('member');
      const { guard } = createGuard(
        { 'workspace:require-permission': 'canCreate' },
        { canCreate: true },
      );

      await expect(guard.canActivate(createContext())).resolves.toBe(true);
    });
  });
});
