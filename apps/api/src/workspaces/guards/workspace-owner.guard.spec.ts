import { ForbiddenException } from '@nestjs/common';
import { WorkspaceOwnerGuard } from './workspace-owner.guard';
import * as accessUtil from './workspace-access.util';

const WS_ID = '507f1f77bcf86cd799439011';

describe('WorkspaceOwnerGuard', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  const createContext = (user: Record<string, unknown> = { sub: 'u1' }) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ params: { workspaceId: WS_ID }, user }),
      }),
    }) as never;

  const guard = () => new WorkspaceOwnerGuard({} as never, {} as never);

  it('owner는 통과시킨다', async () => {
    jest.spyOn(accessUtil, 'resolveMembershipOrThrow').mockResolvedValue({
      workspaceObjectId: WS_ID as never,
      role: 'owner',
    });

    await expect(guard().canActivate(createContext())).resolves.toBe(true);
  });

  it('member는 workspace.access.owner_only로 거부한다', async () => {
    jest.spyOn(accessUtil, 'resolveMembershipOrThrow').mockResolvedValue({
      workspaceObjectId: WS_ID as never,
      role: 'member',
    });

    const error = await guard()
      .canActivate(createContext())
      .catch((e: ForbiddenException) => e);

    expect(error).toBeInstanceOf(ForbiddenException);
    expect((error as ForbiddenException).getResponse()).toMatchObject({
      code: 'workspace.access.owner_only',
    });
  });

  it('요청의 workspaceId와 user.sub를 그대로 인가 로직에 넘긴다', async () => {
    const spy = jest
      .spyOn(accessUtil, 'resolveMembershipOrThrow')
      .mockResolvedValue({ workspaceObjectId: WS_ID as never, role: 'owner' });

    await guard().canActivate(createContext({ sub: 'user-42' }));

    expect(spy).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      WS_ID,
      'user-42',
    );
  });

  it('인가 로직이 던진 예외를 삼키지 않고 그대로 전파한다', async () => {
    jest
      .spyOn(accessUtil, 'resolveMembershipOrThrow')
      .mockRejectedValue(new ForbiddenException('not member'));

    await expect(guard().canActivate(createContext())).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
