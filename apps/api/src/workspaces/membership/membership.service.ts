import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
import { TransactionService } from '../../database/transaction.service';

@Injectable()
export class MembershipService {
  constructor(
    @InjectModel(WorkspaceMembership.name)
    private membershipModel: Model<WorkspaceMembershipDocument>,
    @InjectModel(Workspace.name)
    private workspaceModel: Model<WorkspaceDocument>,
    private readonly transactionService: TransactionService,
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

    const target = await this.membershipModel
      .findOne({
        workspace: wsObjectId,
        user: new Types.ObjectId(userId),
        isDeleted: null,
      })
      .exec();

    if (!target) {
      throw new NotFoundException('Membership not found');
    }

    // owner를 추방하면 WorkspaceOwnerGuard를 통과할 수 있는 사용자가 사라진다.
    // 복구 엔드포인트도 워크스페이스 삭제도 owner를 요구하므로 데이터가 영구 고립된다.
    if (target.role === 'owner') {
      throw new BadRequestException({
        code: 'workspace.member.cannot_remove_owner',
        message: '소유자는 추방할 수 없습니다.',
      });
    }

    // soft delete와 멤버 수 감소는 함께 성공하거나 함께 실패해야 한다.
    // 분리돼 있으면 두 번째 쓰기 실패 시 membersCount가 영구히 어긋난다.
    await this.transactionService.withTransaction(async (session) => {
      target.isDeleted = new Date();
      await target.save({ session });

      await this.workspaceModel
        .updateOne(
          { _id: wsObjectId },
          { $inc: { membersCount: -1 } },
          { session },
        )
        .exec();
    });

    return target;
  }
}
