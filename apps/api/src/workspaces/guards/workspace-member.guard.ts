import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
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

// :workspaceId 파라미터의 워크스페이스에 유효한 멤버십이 있는지 검증
// (JwtAuthGuard 뒤에 배치해야 req.user가 채워져 있음)
@Injectable()
export class WorkspaceMemberGuard implements CanActivate {
  constructor(
    @InjectModel(Workspace.name)
    private workspaceModel: Model<WorkspaceDocument>,
    @InjectModel(WorkspaceMembership.name)
    private membershipModel: Model<WorkspaceMembershipDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();

    await resolveMembershipOrThrow(
      this.workspaceModel,
      this.membershipModel,
      req.params?.workspaceId,
      req.user?.sub,
    );

    return true;
  }
}
