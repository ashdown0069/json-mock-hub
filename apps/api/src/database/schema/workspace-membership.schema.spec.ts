import { WorkspaceMembershipSchema } from './workspace-membership.schema';

describe('WorkspaceMembershipSchema 인덱스', () => {
  const indexes = () => WorkspaceMembershipSchema.indexes();

  it('workspace+user 복합 인덱스가 선언되어 있다 (가드가 요청마다 조회하는 경로)', () => {
    const found = indexes().find(
      ([fields]) => fields.workspace === 1 && fields.user === 1,
    );

    expect(found).toBeDefined();
  });

  it('활성 멤버십에 한해 유니크를 강제한다 (재참여를 막지 않기 위해 부분 인덱스)', () => {
    const [, options] =
      indexes().find(([fields]) => fields.workspace === 1 && fields.user === 1) ??
      [];

    expect(options).toMatchObject({
      unique: true,
      partialFilterExpression: { isDeleted: null },
    });
  });

  it('내 워크스페이스 목록 조회용 user+isDeleted 인덱스가 선언되어 있다', () => {
    const found = indexes().find(
      ([fields]) => fields.user === 1 && fields.isDeleted === 1,
    );

    expect(found).toBeDefined();
  });
});
