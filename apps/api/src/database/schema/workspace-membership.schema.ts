import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { User } from './users.schema';
import { Workspace } from './workspace.schema';

export type WorkspaceMembershipDocument = HydratedDocument<WorkspaceMembership>;
@Schema({ timestamps: true })
export class WorkspaceMembership {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  user: Types.ObjectId | User;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
  })
  workspace: Types.ObjectId | Workspace;

  @Prop({ type: String, default: 'member', required: true })
  role: 'owner' | 'member';

  @Prop({ type: Date, default: null })
  isDeleted: Date | null;

  // MCP 등 외부 클라이언트 인증용 멤버별 API 키.
  // 웹(/mcp 설치 가이드)이 상시 조회해 설치 명령에 채워야 하므로 평문 저장한다
  // (mock 데이터 도구 특성상 키 유출 피해가 제한적이라는 트레이드오프를 수용).
  // getMembers()가 전 멤버를 find()로 가져오므로 select: false가 필수다.
  @Prop({ type: String, default: null, select: false })
  apiKey: string | null;

  @Prop({ type: Date, default: null })
  apiKeyIssuedAt: Date | null;
}

export const WorkspaceMembershipSchema =
  SchemaFactory.createForClass(WorkspaceMembership);

// resolveMembershipOrThrow가 모든 가드된 요청마다 findOne({workspace, user, isDeleted})를
// 수행한다. 인덱스가 없으면 filebrowser/dashboard/role 전 엔드포인트가 요청당 풀스캔을 유발한다.
//
// unique는 joinWorkspace의 "존재 확인 → 생성" TOCTOU가 중복 멤버십을 만드는 것도 막는다.
// 다만 추방은 soft delete(isDeleted: Date)이므로 전체 유니크를 걸면 재참여가 E11000으로 막힌다.
// 활성 멤버십(isDeleted: null)만 대상으로 하는 부분 인덱스로 둔다.
WorkspaceMembershipSchema.index(
  { workspace: 1, user: 1 },
  { unique: true, partialFilterExpression: { isDeleted: null } },
);

// findAll(내가 속한 워크스페이스 목록) 경로용
WorkspaceMembershipSchema.index({ user: 1, isDeleted: 1 });

// 키 → 멤버십 역방향 조회가 이 인덱스를 탄다. 없으면 API 키 인증마다 풀스캔이다.
//
// 위 { workspace, user } 인덱스와 같은 이유로 부분 인덱스를 쓴다. 추방은
// soft delete(isDeleted: Date)이므로 전체 유니크를 걸면 폐기된 키가 자리를
// 점유해 재참여 시 E11000이 난다.
//
// MongoDB는 sparse와 partialFilterExpression의 동시 지정을 거부하므로,
// apiKey가 null인 문서 제외는 partial 조건 안의 $type으로 처리한다.
WorkspaceMembershipSchema.index(
  { apiKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      isDeleted: null,
      apiKey: { $type: 'string' },
    },
  },
);

