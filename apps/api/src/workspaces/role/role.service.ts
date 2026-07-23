import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  WorkspaceRole,
  WorkspaceRoleDocument,
} from '../../database/schema/workspace-role.schema';
@Injectable()
export class RoleService {
  constructor(
    @InjectModel(WorkspaceRole.name)
    private roleModel: Model<WorkspaceRoleDocument>,
  ) {}

  async getRoles(workspaceId: string) {
    const wsObjectId = new Types.ObjectId(workspaceId);
    return this.roleModel.find({ workspace: wsObjectId }).exec();
  }

  // 허용된 권한 플래그만 명시적으로 $set — ValidationPipe에 whitelist가 없어도
  // role/workspace 등 다른 필드가 변조되지 않도록 서비스 계층에서 최종 방어
  private static readonly ALLOWED_PERMISSION_KEYS = [
    'canCreate',
    'canRename',
    'canMove',
    'canDelete',
    'canUpdate',
  ] as const;

  async updateRole(
    workspaceId: string,
    roleId: string,
    permissions: Partial<
      Pick<
        WorkspaceRole,
        'canCreate' | 'canRename' | 'canMove' | 'canDelete' | 'canUpdate'
      >
    >,
  ) {
    const wsObjectId = new Types.ObjectId(workspaceId);

    const update: Record<string, boolean> = {};
    for (const key of RoleService.ALLOWED_PERMISSION_KEYS) {
      if (typeof permissions[key] === 'boolean') {
        update[key] = permissions[key];
      }
    }

    const role = await this.roleModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(roleId),
          workspace: wsObjectId,
        },
        { $set: update },
        { new: true },
      )
      .exec();

    if (!role) {
      throw new NotFoundException('Role not found');
    }
    return role;
  }
}
