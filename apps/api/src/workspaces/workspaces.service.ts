import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateWorkspaceDto } from './dto/req/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/req/update-workspace.dto';
import { TransactionService } from '../database/transaction.service';
import {
  Workspace,
  WorkspaceDocument,
} from '../database/schema/workspace.schema';
import {
  WorkspaceMembership,
  WorkspaceMembershipDocument,
} from '../database/schema/workspace-membership.schema';
import {
  WorkspaceRole,
  WorkspaceRoleDocument,
} from '../database/schema/workspace-role.schema';
import { ApiKeyService } from './api-key.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class WorkspacesService {
  constructor(
    private readonly transactionService: TransactionService,
    private readonly apiKeyService: ApiKeyService,
    @InjectModel(Workspace.name)
    private workspaceModel: Model<WorkspaceDocument>,
    @InjectModel(WorkspaceMembership.name)
    private membershipModel: Model<WorkspaceMembershipDocument>,
    @InjectModel(WorkspaceRole.name)
    private roleModel: Model<WorkspaceRoleDocument>,
  ) {}

  // URL 파라미터(_id)로 워크스페이스 도큐먼트를 조회하는 내부 헬퍼
  private async findWorkspaceById(id: string): Promise<WorkspaceDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Workspace not found');
    }
    const workspace = await this.workspaceModel
      .findOne({ _id: new Types.ObjectId(id), isDeleted: null })
      .exec();
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }
    return workspace;
  }

  async create(createWorkspaceDto: CreateWorkspaceDto, userId: string) {
    return this.transactionService.withTransaction(async (session) => {
      // 1. Create Workspace — API 키는 생성 시점에 무조건 발급된다 (키 없는 상태 없음)
      // passwordConfirm은 검증 전용 필드이므로 저장 대상에서 제외한다
      const { passwordConfirm: _passwordConfirm, ...workspaceFields } =
        createWorkspaceDto;
      const password = await bcrypt.hash(createWorkspaceDto.password, 10);
      const [workspace] = await this.workspaceModel.create(
        [
          {
            ...workspaceFields,
            password: password,
            owner: userId,
            apiKey: this.apiKeyService.generateKey(),
            apiKeyIssuedAt: new Date(),
          },
        ],
        { session },
      );

      // create(배열)은 같은 길이의 배열을 돌려주지만 타입상으로는 보장되지 않는다.
      // 여기서 새면 워크스페이스만 만들어지고 소유자 멤버십·기본 역할이 없는
      // 상태로 트랜잭션이 커밋된다.
      if (!workspace) {
        throw new InternalServerErrorException(
          '워크스페이스 생성에 실패했습니다.',
        );
      }

      // 2. Create Owner Membership — 키는 멤버십에 귀속되므로 여기서 발급한다
      await this.membershipModel.create(
        [
          {
            user: new Types.ObjectId(userId),
            workspace: workspace._id,
            role: 'owner',
            apiKey: this.apiKeyService.generateKey(),
            apiKeyIssuedAt: new Date(),
          },
        ],
        { session },
      );

      // 3. Create Default Owner Role
      await this.roleModel.create(
        [
          {
            workspace: workspace._id,
            owner: new Types.ObjectId(userId),
            role: 'owner',
            canCreate: true,
            canRename: true,
            canDelete: true,
            canMove: true,
            canUpdate: true,
          },
        ],
        { session },
      );

      // 4. Create Member Role
      await this.roleModel.create(
        [
          {
            workspace: workspace._id,
            owner: new Types.ObjectId(userId),
            role: 'member',
            canCreate: true,
            canRename: false,
            canDelete: false,
            canMove: false,
            canUpdate: true,
          },
        ],
        { session },
      );
    });
  }

  async findAll(userId: string) {
    const memberships = await this.membershipModel
      .find({ user: new Types.ObjectId(userId), isDeleted: null })
      .populate('workspace')
      .exec();

    return memberships.map((m) => m.workspace);
  }

  async findOne(workspaceId: string, userId: string) {
    const workspace = await this.findWorkspaceById(workspaceId);

    const membership = await this.membershipModel
      .findOne({
        user: new Types.ObjectId(userId),
        workspace: workspace._id,
        isDeleted: null,
      })
      .populate('workspace')
      .exec();

    if (!membership) {
      throw new NotFoundException('Workspace not found or unauthorized');
    }
    return membership.workspace;
  }

  async update(
    workspaceId: string,
    updateWorkspaceDto: UpdateWorkspaceDto,
    userId: string,
  ) {
    if (!Types.ObjectId.isValid(workspaceId)) {
      throw new NotFoundException(
        'Workspace not found or unauthorized to update',
      );
    }

    // DTO를 그대로 넘기면 owner/isDeleted처럼 선언되지 않은 필드까지 통과한다.
    // ValidationPipe의 whitelist가 1차 방어지만, 서비스에서도 갱신 가능 필드를 명시한다.
    const { name, description, password } = updateWorkspaceDto;
    const update: Record<string, unknown> = {};
    if (name !== undefined) update.name = name;
    if (description !== undefined) update.description = description;
    // 평문 저장을 막는 유일한 지점 — 이전에는 DTO가 그대로 전달돼 평문이 저장됐다
    if (password !== undefined) update.password = await bcrypt.hash(password, 10);

    const workspace = await this.workspaceModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(workspaceId),
          owner: userId,
          isDeleted: null,
        },
        update,
        { new: true },
      )
      .exec();

    if (!workspace) {
      throw new NotFoundException(
        'Workspace not found or unauthorized to update',
      );
    }
    return workspace;
  }

  async remove(workspaceId: string, userId: string) {
    return this.transactionService.withTransaction(async (session) => {
      if (!Types.ObjectId.isValid(workspaceId)) {
        throw new NotFoundException(
          'Workspace not found or unauthorized to delete',
        );
      }
      const workspace = await this.workspaceModel
        .findOneAndUpdate(
          {
            _id: new Types.ObjectId(workspaceId),
            owner: userId,
            isDeleted: null,
          },
          { isDeleted: new Date() },
          { session, new: true },
        )
        .exec();

      if (!workspace) {
        throw new NotFoundException(
          'Workspace not found or unauthorized to delete',
        );
      }

      await this.membershipModel.updateMany(
        { workspace: workspace._id },
        { isDeleted: new Date() },
        { session },
      );

      return { message: 'Workspace deleted successfully' };
    });
  }

  async joinWorkspace(workspaceId: string, userId: string, password: string) {
    // 1. 워크스페이스 존재 여부 확인
    if (!Types.ObjectId.isValid(workspaceId)) {
      throw new NotFoundException({
        code: 'workspace.join.not_found',
        message: '워크스페이스를 찾을 수 없습니다.',
      });
    }
    const workspace = await this.workspaceModel
      .findOne({
        _id: new Types.ObjectId(workspaceId),
        isDeleted: null,
      })
      .exec();

    if (!workspace) {
      throw new NotFoundException({
        code: 'workspace.join.not_found',
        message: '워크스페이스를 찾을 수 없습니다.',
      });
    }

    // 2. 이미 멤버인지 확인
    const existingMembership = await this.membershipModel
      .findOne({
        workspace: workspace._id,
        user: new Types.ObjectId(userId),
        isDeleted: null,
      })
      .exec();

    if (existingMembership) {
      return { message: '이미 멤버입니다.', alreadyMember: true };
    }

    // 3. 비밀번호 검증
    const isPasswordValid = await bcrypt.compare(password, workspace.password);
    if (!isPasswordValid) {
      throw new BadRequestException({
        code: 'workspace.join.password_mismatch',
        message: '비밀번호가 일치하지 않습니다.',
      });
    }

    // 4. 멤버십 생성과 멤버 수 증가는 함께 성공하거나 함께 실패해야 한다.
    //    분리돼 있으면 두 번째 쓰기 실패 시 membersCount가 영구히 어긋나고,
    //    이를 되돌릴 보정 경로가 없다.
    //    mongoose는 create에 session을 넘길 때 문서를 배열로 감싸도록 요구한다.
    await this.transactionService.withTransaction(async (session) => {
      await this.membershipModel.create(
        [
          {
            workspace: workspace._id,
            user: new Types.ObjectId(userId),
            role: 'member',
            apiKey: this.apiKeyService.generateKey(),
            apiKeyIssuedAt: new Date(),
          },
        ],
        { session },
      );

      await this.workspaceModel
        .updateOne(
          { _id: workspace._id },
          { $inc: { membersCount: 1 } },
          { session },
        )
        .exec();
    });

    return { message: '워크스페이스에 참여되었습니다.', alreadyMember: false };
  }

  // 사이드바/설정 페이지에서 owner 여부를 판별할 수 있도록 role도 함께 반환
  async checkMembership(
    workspaceId: string,
    userId: string,
  ): Promise<{ isMember: boolean; role: 'owner' | 'member' | null }> {
    if (!Types.ObjectId.isValid(workspaceId)) {
      return { isMember: false, role: null };
    }
    const workspace = await this.workspaceModel
      .findOne({ _id: new Types.ObjectId(workspaceId), isDeleted: null })
      .exec();

    if (!workspace) return { isMember: false, role: null };

    const membership = await this.membershipModel
      .findOne({
        workspace: workspace._id,
        user: new Types.ObjectId(userId),
        isDeleted: null,
      })
      .exec();

    if (!membership) return { isMember: false, role: null };

    return { isMember: true, role: membership.role };
  }
}
