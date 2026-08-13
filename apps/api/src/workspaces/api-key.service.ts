import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { randomBytes } from 'crypto';
import {
  WorkspaceMembership,
  WorkspaceMembershipDocument,
} from '../database/schema/workspace-membership.schema';

// MCP 등 외부 클라이언트 인증용 멤버별 API 키 발급/조회/검증.
//
// 키를 멤버십 문서에 두는 이유는 두 가지다.
// 1) 검증 한 번으로 "누구인가 · 어느 워크스페이스인가 · 무슨 역할인가"가 동시에 나온다.
// 2) 추방이 soft delete이므로 isDeleted 조건만으로 키가 자동 무효화된다.
//
// 웹(/mcp 설치 가이드)이 키를 상시 조회해 설치 명령에 채워야 하므로 평문으로 저장한다
// (mock 데이터 도구 특성상 키 유출 피해가 제한적이라는 트레이드오프를 수용).
@Injectable()
export class ApiKeyService {
  constructor(
    @InjectModel(WorkspaceMembership.name)
    private membershipModel: Model<WorkspaceMembershipDocument>,
  ) {}

  // 멤버십 생성 시(WorkspacesService.create / joinWorkspace)에도 같은 형식의 키를
  // 만들도록 공개 메서드로 둔다
  generateKey(): string {
    return `mock_${randomBytes(24).toString('hex')}`;
  }

  // 미존재/불일치/추방을 동일한 401로 응답해 워크스페이스 존재 여부 노출을 막는다
  private invalidKeyException() {
    return new UnauthorizedException({
      code: 'auth.api_key.invalid',
      message: '유효하지 않은 API 키입니다.',
    });
  }

  private notMemberException() {
    return new ForbiddenException({
      code: 'workspace.access.not_member',
      message: '워크스페이스 멤버가 아닙니다.',
    });
  }

  private async findActiveMembership(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMembershipDocument> {
    if (
      !Types.ObjectId.isValid(workspaceId) ||
      !Types.ObjectId.isValid(userId)
    ) {
      throw this.notMemberException();
    }

    const membership = await this.membershipModel
      .findOne({
        workspace: new Types.ObjectId(workspaceId),
        user: new Types.ObjectId(userId),
        isDeleted: null,
      })
      .select('+apiKey')
      .exec();

    if (!membership) {
      throw this.notMemberException();
    }
    return membership;
  }

  // 내 키 조회 — "활성 멤버십이면 키가 있다"는 불변식에 의존한다
  async getMyKey(
    workspaceId: string,
    userId: string,
  ): Promise<{ apiKey: string; issuedAt: Date | null }> {
    const membership = await this.findActiveMembership(workspaceId, userId);

    if (!membership.apiKey) {
      // 불변식 위반은 데이터 버그다. null을 흘려보내면 web이 빈 키로 설치 명령을
      // 만들어 원인 파악이 어려운 401로 번진다.
      throw new InternalServerErrorException({
        code: 'workspace.api_key.missing',
        message: 'API 키가 없는 멤버십입니다.',
      });
    }

    return {
      apiKey: membership.apiKey,
      issuedAt: membership.apiKeyIssuedAt ?? null,
    };
  }

  // 재발급 — 본인 키만 교체된다. 다른 멤버의 연동은 끊기지 않는다.
  async reissueMyKey(
    workspaceId: string,
    userId: string,
  ): Promise<{ apiKey: string; issuedAt: Date }> {
    if (
      !Types.ObjectId.isValid(workspaceId) ||
      !Types.ObjectId.isValid(userId)
    ) {
      throw this.notMemberException();
    }

    const apiKey = this.generateKey();
    const issuedAt = new Date();

    const updated = await this.membershipModel
      .findOneAndUpdate(
        {
          workspace: new Types.ObjectId(workspaceId),
          user: new Types.ObjectId(userId),
          isDeleted: null,
        },
        { apiKey, apiKeyIssuedAt: issuedAt },
        { new: true },
      )
      .exec();

    if (!updated) {
      throw this.notMemberException();
    }

    return { apiKey, issuedAt };
  }

  // 검증 — 키 주인의 멤버십을 반환한다 (가드가 sub에 이 user를 넣는다).
  // 평문 비교를 앱에서 하지 않고 키 자체를 조회 조건으로 쓰므로 timingSafeEqual이 필요 없다.
  // 인덱스 조회 시간 차는 네트워크 지터에 묻히고, 192비트 키 공간은 탐색으로 좁혀지지 않는다.
  async verify(
    workspaceId: string | undefined,
    rawKey: string,
  ): Promise<WorkspaceMembershipDocument> {
    if (!workspaceId || !Types.ObjectId.isValid(workspaceId)) {
      throw this.invalidKeyException();
    }

    // workspace 조건을 쿼리에 포함해 타 워크스페이스 키는 애초에 매칭되지 않게 한다.
    // 불일치를 별도 예외로 구분하면 워크스페이스 존재 여부가 새어나가므로 401로 통일한다.
    const membership = await this.membershipModel
      .findOne({
        workspace: new Types.ObjectId(workspaceId),
        apiKey: rawKey,
        isDeleted: null, // 추방된 멤버의 키는 여기서 걸린다
      })
      .select('+apiKey')
      .exec();

    if (!membership) {
      throw this.invalidKeyException();
    }
    return membership;
  }
}
