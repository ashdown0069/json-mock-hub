import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';

/**
 * mock 서버의 쓰기 메서드에만 적용되는 throttle 가드.
 *
 * MockserverController는 핸들러가 @All('*') 하나뿐이라 데코레이터로 메서드를
 * 나눌 수 없다. 읽기(GET)는 Redis에 상태를 남기지 않으므로 제한하지 않고,
 * 오버레이를 늘리는 쓰기만 막는다.
 *
 * 이 가드는 'mock-write' named throttler를 쓴다. 컨트롤러의
 * @SkipThrottle({ 'rate-limit': true })는 전역 가드의 한도만 건너뛰므로
 * 이 한도는 그대로 적용된다.
 */
@Injectable()
export class MockWriteThrottlerGuard extends ThrottlerGuard {
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    return request.method.toUpperCase() === 'GET';
  }
}
