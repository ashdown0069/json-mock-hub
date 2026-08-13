import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { WorkspaceMemberGuard } from './workspace-member.guard';
import * as accessUtil from './workspace-access.util';

const WS_ID = '507f1f77bcf86cd799439011';

describe('WorkspaceMemberGuard', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  const createContext = (user: Record<string, unknown> = { sub: 'u1' }) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ params: { workspaceId: WS_ID }, user }),
      }),
    }) as never;

  const guard = () => new WorkspaceMemberGuard({} as never, {} as never);

  it.each(['owner', 'member'] as const)(
    '%s 역할은 모두 통과시킨다',
    async (role) => {
      jest
        .spyOn(accessUtil, 'resolveMembershipOrThrow')
        .mockResolvedValue({ workspaceObjectId: WS_ID as never, role });

      await expect(guard().canActivate(createContext())).resolves.toBe(true);
    },
  );

  it('비멤버는 ForbiddenException으로 거부된다', async () => {
    jest
      .spyOn(accessUtil, 'resolveMembershipOrThrow')
      .mockRejectedValue(new ForbiddenException('not member'));

    await expect(guard().canActivate(createContext())).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('미인증 요청은 UnauthorizedException으로 거부된다', async () => {
    jest
      .spyOn(accessUtil, 'resolveMembershipOrThrow')
      .mockRejectedValue(new UnauthorizedException('unauthorized'));

    await expect(guard().canActivate(createContext())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
