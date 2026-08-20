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
import { REQUIRE_OWNER_KEY } from './require-owner.decorator';

// 판정 흐름:
// 1. API Key 요청이면 발급 워크스페이스와 URL의 :workspaceId 일치 여부 대조
// 2. resolveMembershipOrThrow로 멤버십 검증 (멤버가 아니면 여기서 예외)
// 3. owner 역할이면 무조건 통과 (모든 권한 보유)
// 4. @RequireOwner() 메타데이터가 있으면 → 403 (owner가 아니므로)
// 5. @RequirePermission(...) 메타데이터가 있으면 → WorkspaceRole 문서로 세부 권한 검사
// 6. 두 메타데이터 모두 없으면 → 멤버이므로 통과
@Injectable()
export class WorkspaceAccessGuard implements CanActivate {
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

    // 1. API 키 인증은 발급된 워크스페이스로만 스코프를 제한한다.
    if (
      req.user?.viaApiKey &&
      req.user.apiKeyWorkspaceId !== req.params?.workspaceId
    ) {
      throw new ForbiddenException({
        code: 'auth.api_key.workspace_mismatch',
        message: 'API 키가 이 워크스페이스에 대해 발급되지 않았습니다.',
      });
    }

    // 2. 멤버십 검증
    const { workspaceObjectId, role } = await resolveMembershipOrThrow(
      this.workspaceModel,
      this.membershipModel,
      req.params?.workspaceId,
      req.user?.sub,
    );

    // 3. owner는 무조건 통과
    if (role === 'owner') {
      return true;
    }

    // 4. @RequireOwner() 검사
    const requireOwner = this.reflector.getAllAndOverride<boolean | undefined>(
      REQUIRE_OWNER_KEY,
      [context.getHandler(), context.getClass()],
    );

    // @RequireOwner() 푯말이 붙어있는데 일반 멤버인 경우 -> 403 에러 발생
    if (requireOwner) {
      throw new ForbiddenException({
        code: 'workspace.access.owner_only',
        message: '워크스페이스 소유자만 사용할 수 있습니다.',
      });
    }

    // 5. @RequirePermission(...) 검사
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
