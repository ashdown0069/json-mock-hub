import {
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { resolveMembershipOrThrow } from './workspace-access.util';

const WS_ID = '507f1f77bcf86cd799439011';
const USER_ID = '507f1f77bcf86cd799439033';

describe('resolveMembershipOrThrow', () => {
  const wsObjectId = new Types.ObjectId(WS_ID);

  const makeModels = (
    workspace: unknown = { _id: wsObjectId },
    membership: unknown = { role: 'member' },
  ) => ({
    workspaceModel: {
      findOne: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(workspace) }),
    },
    membershipModel: {
      findOne: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(membership) }),
    },
  });

  it('userId가 없으면 UnauthorizedException을 던진다', async () => {
    const { workspaceModel, membershipModel } = makeModels();

    await expect(
      resolveMembershipOrThrow(
        workspaceModel as never,
        membershipModel as never,
        WS_ID,
        undefined,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    // 인증 실패 시 DB를 건드리지 않는다
    expect(workspaceModel.findOne).not.toHaveBeenCalled();
  });

  it.each([undefined, '', 'not-an-object-id'])(
    'workspaceId가 %p이면 NotFoundException을 던진다',
    async (workspaceId) => {
      const { workspaceModel, membershipModel } = makeModels();

      await expect(
        resolveMembershipOrThrow(
          workspaceModel as never,
          membershipModel as never,
          workspaceId,
          USER_ID,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    },
  );

  it('워크스페이스가 없으면 NotFoundException을 던진다', async () => {
    const { workspaceModel, membershipModel } = makeModels(null);

    await expect(
      resolveMembershipOrThrow(
        workspaceModel as never,
        membershipModel as never,
        WS_ID,
        USER_ID,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('삭제된 워크스페이스를 걸러내도록 isDeleted 조건을 건다', async () => {
    const { workspaceModel, membershipModel } = makeModels();

    await resolveMembershipOrThrow(
      workspaceModel as never,
      membershipModel as never,
      WS_ID,
      USER_ID,
    );

    const [filter] = workspaceModel.findOne.mock.calls[0];
    expect(filter.isDeleted).toBeNull();
  });

  it('멤버십이 없으면 ForbiddenException을 던진다', async () => {
    const { workspaceModel, membershipModel } = makeModels(
      { _id: wsObjectId },
      null,
    );

    await expect(
      resolveMembershipOrThrow(
        workspaceModel as never,
        membershipModel as never,
        WS_ID,
        USER_ID,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('탈퇴한 멤버십을 걸러내도록 isDeleted 조건을 건다', async () => {
    const { workspaceModel, membershipModel } = makeModels();

    await resolveMembershipOrThrow(
      workspaceModel as never,
      membershipModel as never,
      WS_ID,
      USER_ID,
    );

    const [filter] = membershipModel.findOne.mock.calls[0];
    expect(filter.isDeleted).toBeNull();
    expect(filter.user.toString()).toBe(USER_ID);
  });

  it('통과하면 워크스페이스 ObjectId와 역할을 반환한다', async () => {
    const { workspaceModel, membershipModel } = makeModels(
      { _id: wsObjectId },
      { role: 'owner' },
    );

    const result = await resolveMembershipOrThrow(
      workspaceModel as never,
      membershipModel as never,
      WS_ID,
      USER_ID,
    );

    expect(result.role).toBe('owner');
    expect(result.workspaceObjectId.toString()).toBe(WS_ID);
  });
});
