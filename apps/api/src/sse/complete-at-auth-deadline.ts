import { Request } from 'express';
import { defer, Observable, timer } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { JwtAccessPrincipal } from '../auth/strategies/jwt.strategy';

export type SseRequest = Request & {
  user?: JwtAccessPrincipal | {
    sub: string;
    viaApiKey: true;
    apiKeyWorkspaceId: string;
  };
};

// 권한 변경을 기존 연결에 반영하는 최대 주기. cookie 수명과 독립적인 정책이다.
export const SSE_AUTH_RECHECK_INTERVAL_MS = 15 * 60 * 1000;

export function completeAtAuthDeadline<T>(
  stream$: Observable<T>,
  expiresAtSeconds: unknown,
  now: () => number = Date.now,
): Observable<T> {
  return defer(() => {
    const startedAt = now();
    const authRecheckDeadline =
      startedAt + SSE_AUTH_RECHECK_INTERVAL_MS;
    const jwtDeadline =
      typeof expiresAtSeconds === 'number' &&
      Number.isFinite(expiresAtSeconds)
        ? expiresAtSeconds * 1000
        : Infinity;
    const delayMs = Math.max(
      0,
      Math.min(authRecheckDeadline, jwtDeadline) - startedAt,
    );
    return stream$.pipe(takeUntil(timer(delayMs)));
  });
}
