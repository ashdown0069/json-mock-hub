import { ExecutionContext } from '@nestjs/common';
import { currentUserIdFactory } from './current-user-id.decorator';

const ctxWith = (user: unknown): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  }) as unknown as ExecutionContext;

describe('currentUserIdFactory', () => {
  it('req.user.sub를 반환한다', () => {
    expect(currentUserIdFactory(undefined, ctxWith({ sub: 'user-1' }))).toBe(
      'user-1',
    );
  });
  it('user가 없으면 undefined를 반환한다', () => {
    expect(currentUserIdFactory(undefined, ctxWith(undefined))).toBeUndefined();
  });
});
