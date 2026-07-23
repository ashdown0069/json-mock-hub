import {
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { WorkspaceDocument } from '../../database/schema/workspace.schema';
import { WorkspaceMembershipDocument } from '../../database/schema/workspace-membership.schema';

// 가드 3종이 공유하는 조회 로직.
// 주입 가능한 서비스 대신 순수 함수로 둔 이유: 가드가 여러 모듈(filebrowser 등)에서
// 쓰이는데, DI 서비스로 만들면 모든 모듈의 providers에 등록해야 한다.
// 모델은 DatabaseModule이 전역 export하므로 가드가 직접 주입받아 넘기면 배선이 단순해진다.
export async function resolveMembershipOrThrow(
  workspaceModel: Model<WorkspaceDocument>,
  membershipModel: Model<WorkspaceMembershipDocument>,
  workspaceId: string | undefined,
  userId: string | undefined,
): Promise<{
  workspaceObjectId: Types.ObjectId;
  role: 'owner' | 'member';
}> {
  if (!userId) {
    throw new UnauthorizedException({
      code: 'auth.unauthorized',
      message: '인증이 필요합니다.',
    });
  }

  if (!workspaceId || !Types.ObjectId.isValid(workspaceId)) {
    throw new NotFoundException({
      code: 'workspace.access.not_found',
      message: '워크스페이스를 찾을 수 없습니다.',
    });
  }

  const workspace = await workspaceModel
    .findOne(
      { _id: new Types.ObjectId(workspaceId), isDeleted: null },
      { _id: 1 },
    )
    .exec();

  if (!workspace) {
    throw new NotFoundException({
      code: 'workspace.access.not_found',
      message: '워크스페이스를 찾을 수 없습니다.',
    });
  }

  const membership = await membershipModel
    .findOne({
      workspace: workspace._id,
      user: new Types.ObjectId(userId),
      isDeleted: null,
    })
    .exec();

  if (!membership) {
    throw new ForbiddenException({
      code: 'workspace.access.not_member',
      message: '워크스페이스 멤버가 아닙니다.',
    });
  }

  return {
    workspaceObjectId: workspace._id as Types.ObjectId,
    role: membership.role,
  };
}
