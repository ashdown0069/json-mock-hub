import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';

/** 상태를 바꾸는 메서드만 검사한다. GET/HEAD/OPTIONS는 CSRF 대상이 아니다. */
const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** MockserverController가 @Controller('api')이므로 mock 요청은 /api 또는 /api/**로 들어온다. */
const MOCK_ROUTE_PATTERN = /^\/api(\/|\?|$)/;

export const CSRF_HEADER = 'x-requested-with';
export const CSRF_HEADER_VALUE = 'XMLHttpRequest';

/**
 * 커스텀 헤더 기반 CSRF 방어.
 *
 * 웹과 API가 서로 다른 사이트에 배포되어 인증 쿠키가 SameSite=None이어야 하므로,
 * 브라우저의 기본 CSRF 방어를 쓸 수 없다. 대신 커스텀 헤더를 요구한다 —
 * 커스텀 헤더는 반드시 프리플라이트를 유발하므로 <form> 기반 공격은 헤더를 붙일 수 없다.
 * (Nest는 urlencoded 파서를 기본 활성화해 form POST가 그대로 도달한다)
 */
@Injectable()
export class CsrfHeaderGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // SSE 등 http가 아닌 컨텍스트는 대상이 아니다
    if (context.getType() !== 'http') return true;

    const req = context.switchToHttp().getRequest<Request>();

    if (!STATE_CHANGING_METHODS.has((req.method ?? '').toUpperCase())) {
      return true;
    }

    // mock 서버는 외부 앱이 임의 클라이언트로 호출하는 공개 엔드포인트이며
    // 쿠키 인증을 쓰지 않으므로 CSRF가 성립하지 않는다
    if (MOCK_ROUTE_PATTERN.test(req.url ?? '')) return true;

    // API 키 인증도 쿠키를 쓰지 않는다.
    // (x-api-key 자체가 커스텀 헤더라 이미 프리플라이트를 유발한다)
    if (req.headers['x-api-key']) return true;

    const raw = req.headers[CSRF_HEADER];
    const value = Array.isArray(raw) ? raw[0] : raw;

    if (value !== CSRF_HEADER_VALUE) {
      throw new ForbiddenException({
        code: 'auth.csrf.header_required',
        message: `상태 변경 요청에는 ${CSRF_HEADER}: ${CSRF_HEADER_VALUE} 헤더가 필요합니다.`,
      });
    }

    return true;
  }
}
