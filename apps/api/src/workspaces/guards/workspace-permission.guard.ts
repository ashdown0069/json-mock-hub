import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
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
import {
  WorkspaceRole,
  WorkspaceRoleDocument,
} from '../../database/schema/workspace-role.schema';
import { resolveMembershipOrThrow } from './workspace-access.util';
import {
  REQUIRE_PERMISSION_KEY,
  WorkspacePermissionKey,
} from './require-permission.decorator';

// 멤버십 검증 + @RequirePermission 메타데이터의 권한 플래그 검사.
// - owner는 무조건 통과 (모든 권한 보유)
// - 메타데이터가 없는 핸들러는 멤버 검증만 수행 (getItems, SSE 구독 등 읽기 경로)
@Injectable()
export class WorkspacePermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectModel(Workspace.name)
    private workspaceModel: Model<WorkspaceDocument>,
    @InjectModel(WorkspaceMembership.name)
    private membershipModel: Model<WorkspaceMembershipDocument>,
    @InjectModel(WorkspaceRole.name)
    private roleModel: Model<WorkspaceRoleDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();

    const { workspaceObjectId, role } = await resolveMembershipOrThrow(
      this.workspaceModel,
      this.membershipModel,
      req.params?.workspaceId,
      req.user?.sub,
    );

    if (role === 'owner') {
      return true;
    }

    const permission = this.reflector.getAllAndOverride<
      WorkspacePermissionKey | undefined
    >(REQUIRE_PERMISSION_KEY, [context.getHandler(), context.getClass()]);

    if (!permission) {
      return true;
    }

    const roleDoc = await this.roleModel
      .findOne({ workspace: workspaceObjectId, role: 'member' })
      .exec();

    const allowed = roleDoc?.[permission] ?? false;

    if (!allowed) {
      throw new ForbiddenException({
        code: 'workspace.permission.denied',
        message: '이 작업을 수행할 권한이 없습니다.',
      });
    }

    return true;
  }
}
