import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Workspace,
  WorkspaceDocument,
} from '../../database/schema/workspace.schema';
import {
  WorkspaceMembership,
  WorkspaceMembershipDocument,
} from '../../database/schema/workspace-membership.schema';
import { resolveMembershipOrThrow } from './workspace-access.util';

// 워크스페이스 owner만 통과 (멤버 관리·역할 수정 등 관리 기능 전용)
@Injectable()
export class WorkspaceOwnerGuard implements CanActivate {
  constructor(
    @InjectModel(Workspace.name)
    private workspaceModel: Model<WorkspaceDocument>,
    @InjectModel(WorkspaceMembership.name)
    private membershipModel: Model<WorkspaceMembershipDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();

    const { role } = await resolveMembershipOrThrow(
      this.workspaceModel,
      this.membershipModel,
      req.params?.workspaceId,
      req.user?.sub,
    );

    if (role !== 'owner') {
      throw new ForbiddenException({
        code: 'workspace.access.owner_only',
        message: '워크스페이스 소유자만 사용할 수 있습니다.',
      });
    }

    return true;
  }
}
