import { ExecutionContext } from '@nestjs/common';
import { MockWriteThrottlerGuard } from './mock-write-throttler.guard';

describe('MockWriteThrottlerGuard', () => {
  // shouldSkip은 protected이므로 서브클래스로 노출해 검증한다
  class Probe extends MockWriteThrottlerGuard {
    public callShouldSkip(context: ExecutionContext) {
      return this.shouldSkip(context);
    }
  }

  const guard = new Probe(null as never, null as never, null as never);

  const contextOf = (method: string) =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ method }) }),
    }) as unknown as ExecutionContext;

  it('GET은 throttle을 건너뛴다', async () => {
    // 읽기는 Redis에 쓰기를 남기지 않으므로 mock 서버의 용도상 제한하지 않는다
    await expect(guard.callShouldSkip(contextOf('GET'))).resolves.toBe(true);
  });

  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])(
    '%s는 throttle을 적용한다',
    async (method) => {
      await expect(guard.callShouldSkip(contextOf(method))).resolves.toBe(false);
    },
  );
});
