import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { randomBytes, timingSafeEqual } from 'crypto';
import {
  Workspace,
  WorkspaceDocument,
} from '../database/schema/workspace.schema';

// MCP 등 외부 클라이언트 인증용 워크스페이스 API 키 발급/조회/검증.
// 웹(/mcp 설치 가이드, 설정 페이지)에서 키를 상시 조회해 자동 주입해야 하므로 평문으로 저장한다
// (mock 데이터 도구 특성상 키 유출 피해가 제한적이라는 트레이드오프를 수용).
@Injectable()
export class ApiKeyService {
  constructor(
    @InjectModel(Workspace.name)
    private workspaceModel: Model<WorkspaceDocument>,
  ) {}

  // 워크스페이스 생성 시(WorkspacesService.create)에도 동일 형식의 키를 만들도록 공개 메서드로 둔다
  generateKey(): string {
    return `mock_${randomBytes(24).toString('hex')}`;
  }

  // 미존재/미발급/불일치를 동일한 401로 응답해 워크스페이스 존재 여부 노출을 막는다
  private invalidKeyException() {
    return new UnauthorizedException({
      code: 'auth.api_key.invalid',
      message: '유효하지 않은 API 키입니다.',
    });
  }

  private notFoundException() {
    return new NotFoundException({
      code: 'workspace.access.not_found',
      message: '워크스페이스를 찾을 수 없습니다.',
    });
  }

  // 재발급 — 기존 키는 덮어써서 즉시 무효화된다
  async issue(
    workspaceId: string,
  ): Promise<{ apiKey: string; issuedAt: Date }> {
    if (!Types.ObjectId.isValid(workspaceId)) {
      throw this.notFoundException();
    }

    const apiKey = this.generateKey();
    const issuedAt = new Date();

    const workspace = await this.workspaceModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(workspaceId), isDeleted: null },
        { apiKey, apiKeyIssuedAt: issuedAt },
        { new: true },
      )
      .exec();

    if (!workspace) {
      throw this.notFoundException();
    }

    return { apiKey, issuedAt };
  }

  // 조회 — 키는 워크스페이스 생성 시 무조건 발급되므로 항상 존재하는 것이 불변식이다.
  // 단, 자동 발급 도입 전에 만들어진 워크스페이스(영속 DB의 레거시 데이터)는 키가 없으므로
  // 조회 시점에 즉석 발급해 불변식을 복구한다.
  async getKey(
    workspaceId: string,
  ): Promise<{ apiKey: string; issuedAt: Date | null }> {
    if (!Types.ObjectId.isValid(workspaceId)) {
      throw this.notFoundException();
    }

    const workspace = await this.workspaceModel
      .findOne({ _id: new Types.ObjectId(workspaceId), isDeleted: null })
      .select('+apiKey')
      .exec();

    if (!workspace) {
      throw this.notFoundException();
    }

    if (!workspace.apiKey) {
      return this.issue(workspaceId);
    }

    return {
      apiKey: workspace.apiKey,
      issuedAt: workspace.apiKeyIssuedAt ?? null,
    };
  }

  // 검증 성공 시 워크스페이스 문서를 반환한다 (가드가 owner를 대행 주체로 사용)
  async verify(
    workspaceId: string | undefined,
    rawKey: string,
  ): Promise<WorkspaceDocument> {
    if (!workspaceId || !Types.ObjectId.isValid(workspaceId)) {
      throw this.invalidKeyException();
    }

    const workspace = await this.workspaceModel
      .findOne({ _id: new Types.ObjectId(workspaceId), isDeleted: null })
      .select('+apiKey')
      .exec();

    if (!workspace?.apiKey) {
      throw this.invalidKeyException();
    }

    // 평문 비교지만 타이밍 공격 방지를 위해 timingSafeEqual 유지
    const expected = Buffer.from(workspace.apiKey, 'utf8');
    const actual = Buffer.from(rawKey, 'utf8');

    if (
      expected.length !== actual.length ||
      !timingSafeEqual(expected, actual)
    ) {
      throw this.invalidKeyException();
    }

    return workspace;
  }
}
