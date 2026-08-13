import { ForbiddenException } from '@nestjs/common';
import { WorkspacePermissionGuard } from './workspace-permission.guard';
import * as accessUtil from './workspace-access.util';

const WS_ID = '507f1f77bcf86cd799439011';
const OTHER_WS_ID = '507f1f77bcf86cd799439099';

describe('WorkspacePermissionGuard — API 키 스코프 검사', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  const createGuard = (role: 'owner' | 'member') => {
    jest.spyOn(accessUtil, 'resolveMembershipOrThrow').mockResolvedValue({
      workspaceObjectId: WS_ID as any,
      role,
    });

    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(undefined) } as any;
    const roleModel = {
      findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
    } as any;

    return new WorkspacePermissionGuard(reflector, {} as any, {} as any, roleModel);
  };

  const createContext = (user: Record<string, unknown>) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ params: { workspaceId: WS_ID }, user }),
      }),
      getHandler: () => undefined,
      getClass: () => undefined,
    }) as any;

  it('세션 로그인 owner는 그대로 통과한다', async () => {
    const guard = createGuard('owner');

    await expect(
      guard.canActivate(createContext({ sub: 'u1' })),
    ).resolves.toBe(true);
  });

  it('발급 워크스페이스와 일치하는 API 키는 통과한다', async () => {
    const guard = createGuard('owner');

    await expect(
      guard.canActivate(
        createContext({ sub: 'owner1', viaApiKey: true, apiKeyWorkspaceId: WS_ID }),
      ),
    ).resolves.toBe(true);
  });

  it('다른 워크스페이스로 발급된 API 키는 거부한다', async () => {
    const guard = createGuard('owner');

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

  it('API 키로 들어온 member는 canDelete가 꺼져 있으면 거부된다', async () => {
    // 예전에는 키 소지자가 owner로 대행되어 이 요청이 통과했다.
    // sub가 키 주인으로 바뀌면서 member role 문서의 플래그가 실제로 적용된다.
    jest.spyOn(accessUtil, 'resolveMembershipOrThrow').mockResolvedValue({
      workspaceObjectId: WS_ID as any,
      role: 'member',
    });

    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue('canDelete'),
    } as any;
    const roleModel = {
      findOne: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue({ canDelete: false }) }),
    } as any;

    const guard = new WorkspacePermissionGuard(reflector, {} as any, {} as any, roleModel);

    const context = ({
      switchToHttp: () => ({
        getRequest: () => ({
          params: { workspaceId: WS_ID },
          user: { sub: 'm1', viaApiKey: true, apiKeyWorkspaceId: WS_ID },
        }),
      }),
      getHandler: () => undefined,
      getClass: () => undefined,
    }) as any;

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('API 키로 들어온 owner는 세분 권한 검사 없이 통과한다', async () => {
    jest.spyOn(accessUtil, 'resolveMembershipOrThrow').mockResolvedValue({
      workspaceObjectId: WS_ID as any,
      role: 'owner',
    });

    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue('canDelete'),
    } as any;
    const roleModel = {
      findOne: jest.fn(),
    } as any;

    const guard = new WorkspacePermissionGuard(reflector, {} as any, {} as any, roleModel);

    const context = ({
      switchToHttp: () => ({
        getRequest: () => ({
          params: { workspaceId: WS_ID },
          user: { sub: 'o1', viaApiKey: true, apiKeyWorkspaceId: WS_ID },
        }),
      }),
      getHandler: () => undefined,
      getClass: () => undefined,
    }) as any;

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(roleModel.findOne).not.toHaveBeenCalled();
  });
});
