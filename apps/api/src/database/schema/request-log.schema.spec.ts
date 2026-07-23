import { RequestLogSchema } from './request-log.schema';

describe('RequestLogSchema', () => {
  it('조회용 복합 인덱스 {workspace:1, createdAt:-1}가 존재한다', () => {
    const indexes = RequestLogSchema.indexes();
    expect(indexes).toEqual(
      expect.arrayContaining([
        expect.arrayContaining([{ workspace: 1, createdAt: -1 }]),
      ]),
    );
  });

  it('createdAt 단일 필드에 30일 TTL 인덱스가 존재한다', () => {
    const ttl = RequestLogSchema.indexes().find(
      ([fields]) => JSON.stringify(fields) === JSON.stringify({ createdAt: 1 }),
    );
    expect(ttl).toBeDefined();
    expect(ttl![1].expireAfterSeconds).toBe(60 * 60 * 24 * 30);
  });
});
