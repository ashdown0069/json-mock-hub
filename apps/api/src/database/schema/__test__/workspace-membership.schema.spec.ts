import { WorkspaceMembershipSchema } from '../workspace-membership.schema';

describe('WorkspaceMembershipSchema', () => {
  it('apiKey는 기본 조회에서 제외된다(select: false)', () => {
    // getMembers()가 전 멤버를 find()로 가져오므로, select:false가 아니면
    // 한 명이 목록을 볼 때 다른 멤버의 키가 전부 딸려온다.
    expect(WorkspaceMembershipSchema.path('apiKey').options.select).toBe(false);
  });

  it('apiKey에 유니크 부분 인덱스가 걸려 있다', () => {
    const found = WorkspaceMembershipSchema.indexes().find(
      ([fields]) => (fields as Record<string, unknown>).apiKey === 1,
    );

    expect(found).toBeDefined();
    const [, options] = found as [unknown, Record<string, unknown>];
    expect(options.unique).toBe(true);
  });

  it('폐기된 키가 유니크 자리를 점유하지 않도록 활성 멤버십만 인덱싱한다', () => {
    // 추방은 soft delete라 문서가 남는다. 전체 유니크면 재참여 시 E11000이 난다.
    const found = WorkspaceMembershipSchema.indexes().find(
      ([fields]) => (fields as Record<string, unknown>).apiKey === 1,
    );
    const [, options] = found as [unknown, Record<string, unknown>];

    expect(options.partialFilterExpression).toEqual({
      isDeleted: null,
      apiKey: { $type: 'string' },
    });
  });

  it('sparse와 partialFilterExpression을 함께 쓰지 않는다', () => {
    // MongoDB는 두 옵션의 동시 지정을 거부한다. 함께 쓰면 인덱스 생성이 실패한다.
    const found = WorkspaceMembershipSchema.indexes().find(
      ([fields]) => (fields as Record<string, unknown>).apiKey === 1,
    );
    const [, options] = found as [unknown, Record<string, unknown>];

    expect(options.sparse).toBeUndefined();
  });
});
