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
    const userObjectId = new Types.ObjectId(userId);

    return this.transactionService.withTransaction(async (session) => {
      // 1. { isDeleted: null } 조건으로 원자적 soft delete 수행
      //    동시에 중복 추방 요청이 들어와도 단 1개의 요청만 문서를 매칭하여 수정한다.
      const target = await this.membershipModel
        .findOneAndUpdate(
          {
            workspace: wsObjectId,
            user: userObjectId,
            isDeleted: null,
          },
          { $set: { isDeleted: new Date() } },
          { session, new: false },
        )
        .exec();

      if (!target) {
        throw new NotFoundException('Membership not found');
      }

      // owner를 추방하면 WorkspaceOwnerGuard를 통과할 수 있는 사용자가 사라진다.
      // 복구 엔드포인트도 워크스페이스 삭제도 owner를 요구하므로 데이터가 영구 고립된다.
      // 트랜잭션 내에서 예외가 발생하므로 위 soft-delete 쓰기는 자동 롤백된다.
      if (target.role === 'owner') {
        throw new BadRequestException({
          code: 'workspace.member.cannot_remove_owner',
          message: '소유자는 추방할 수 없습니다.',
        });
      }

      // 2. 실제로 멤버가 soft-delete된 경우에만 membersCount를 1 차감한다.
      await this.workspaceModel
        .updateOne(
          { _id: wsObjectId },
          { $inc: { membersCount: -1 } },
          { session },
        )
        .exec();

      target.isDeleted = new Date();
      return target;
    });
  }
}
