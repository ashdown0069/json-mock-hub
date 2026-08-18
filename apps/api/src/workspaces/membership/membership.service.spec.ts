import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MembershipService } from './membership.service';

const WS_ID = '507f1f77bcf86cd799439011';
const USER_ID = '507f1f77bcf86cd799439012';
// withTransaction 목이 콜백에 넘길 가짜 세션 (쓰기 인자로 전달됐는지 검증)
const FAKE_SESSION = {} as any;

describe('MembershipService.removeMember', () => {
  const createService = (membership: Record<string, unknown> | null) => {
    const findOneAndUpdate = jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue(membership) });
    const membershipModel = { findOneAndUpdate } as any;

    const updateOne = jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue(undefined) });
    const workspaceModel = { updateOne } as any;

    const withTransaction = jest.fn((cb: (session: unknown) => unknown) =>
      cb(FAKE_SESSION),
    );
    const transactionService = { withTransaction } as any;

    return {
      service: new MembershipService(
        membershipModel,
        workspaceModel,
        transactionService,
      ),
      findOneAndUpdate,
      updateOne,
      withTransaction,
    };
  };

  it('대상 멤버십이 없으면 NotFoundException을 던진다', async () => {
    const { service } = createService(null);

    await expect(service.removeMember(WS_ID, USER_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('owner는 추방할 수 없다 — 워크스페이스가 영구히 잠기기 때문', async () => {
    const { service } = createService({ role: 'owner' });

    await expect(service.removeMember(WS_ID, USER_ID)).rejects.toMatchObject({
      response: { code: 'workspace.member.cannot_remove_owner' },
    });
    await expect(service.removeMember(WS_ID, USER_ID)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('owner를 추방하려 하면 membersCount를 감소시키지 않는다', async () => {
    const { service, updateOne } = createService({
      role: 'owner',
    });

    await expect(service.removeMember(WS_ID, USER_ID)).rejects.toThrow();
    expect(updateOne).not.toHaveBeenCalled();
  });

  it('member는 findOneAndUpdate로 원자적 soft delete하고 membersCount를 1 줄인다', async () => {
    const membership: Record<string, unknown> = { role: 'member', isDeleted: null };
    const { service, findOneAndUpdate, updateOne } = createService(membership);

    const result = await service.removeMember(WS_ID, USER_ID);

    expect(findOneAndUpdate).toHaveBeenCalledWith(
      {
        workspace: expect.anything(),
        user: expect.anything(),
        isDeleted: null,
      },
      { $set: { isDeleted: expect.any(Date) } },
      { session: FAKE_SESSION, new: false },
    );
    expect(updateOne).toHaveBeenCalledWith(
      expect.anything(),
      { $inc: { membersCount: -1 } },
      { session: FAKE_SESSION },
    );
    expect(result.isDeleted).toBeInstanceOf(Date);
  });

  it('soft delete와 membersCount 감소를 한 트랜잭션으로 묶는다', async () => {
    // 두 쓰기가 분리돼 있으면 두 번째 실패 시 멤버 수가 영구히 어긋난다.
    const membership: Record<string, unknown> = { role: 'member', isDeleted: null };
    const { service, withTransaction } = createService(membership);

    await service.removeMember(WS_ID, USER_ID);

    expect(withTransaction).toHaveBeenCalledTimes(1);
  });
});
