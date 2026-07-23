import { Exclude, Expose, Transform } from 'class-transformer';

@Exclude()
export class GetMemberDto {
  @Expose()
  @Transform(({ obj }) => obj._id.toString())
  id: string;

  @Expose()
  @Transform(({ obj }) => obj.workspace.toString())
  workspace: string;

  // populate('user', 'email nickname')된 문서에서 필요한 필드만 평탄화하여 노출
  @Expose()
  @Transform(({ obj }) => obj.user?._id?.toString() ?? obj.user?.toString())
  userId: string;

  @Expose()
  @Transform(({ obj }) => obj.user?.email ?? null)
  email: string | null;

  @Expose()
  @Transform(({ obj }) => obj.user?.nickname ?? null)
  nickname: string | null;

  @Expose()
  role: 'owner' | 'member';

  // 스키마에 joinedAt이 없어 timestamps의 createdAt을 가입일로 사용
  @Expose()
  @Transform(({ obj }) => obj.createdAt)
  joinedAt: Date;
}
