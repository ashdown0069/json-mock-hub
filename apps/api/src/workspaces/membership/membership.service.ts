import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  WorkspaceMembership,
  WorkspaceMembershipDocument,
} from '../../database/schema/workspace-membership.schema';
import {
  Workspace,
  WorkspaceDocument,
} from '../../database/schema/workspace.schema';

@Injectable()
export class MembershipService {
  constructor(
    @InjectModel(WorkspaceMembership.name)
    private membershipModel: Model<WorkspaceMembershipDocument>,
    @InjectModel(Workspace.name)
    private workspaceModel: Model<WorkspaceDocument>,
  ) {}

  async getMembers(workspaceId: string) {
    const wsObjectId = new Types.ObjectId(workspaceId);
    return this.membershipModel
      .find({ workspace: wsObjectId, isDeleted: null })
      .populate('user', 'email nickname')
      .exec();
  }

  async removeMember(workspaceId: string, userId: string) {
    const wsObjectId = new Types.ObjectId(workspaceId);

    const result = await this.membershipModel
      .findOneAndUpdate(
        {
          workspace: wsObjectId,
          user: new Types.ObjectId(userId),
          isDeleted: null,
        },
        { isDeleted: new Date() },
        { new: true },
      )
      .exec();

    if (!result) {
      throw new NotFoundException('Membership not found');
    }

    // 멤버 수 1 감소
    await this.workspaceModel
      .updateOne({ _id: wsObjectId }, { $inc: { membersCount: -1 } })
      .exec();

    return result;
  }
}
