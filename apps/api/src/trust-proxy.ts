/**
 * Express `trust proxy` 설정값의 단일 출처.
 *
 * true로 두면 안 된다. X-Forwarded-For 전체를 신뢰해 req.ip가 요청자가 써 넣은
 * 맨 왼쪽 값이 되고, @nestjs/throttler는 req.ip를 rate limit 추적 키로 쓴다
 * (throttler.guard.js의 getTracker는 req.ip를 그대로 반환한다).
 * 요청마다 헤더를 바꾸면 auth.controller.ts의 로그인 5회/분 제한이 통째로 뚫린다.
 *
 * 홉 수를 명시하면 Express가 X-Forwarded-For 오른쪽에서 그만큼 건너뛴 값을
 * req.ip로 삼는다. 그 값은 프록시가 기록한 것이라 위조할 수 없다.
 *
 * 2인 이유: 이 프로젝트의 프로덕션은 Cloudflare -> Nginx 2단 구성이다.
 * 프록시 단수가 바뀌면 이 값도 함께 바꿔야 한다.
 * - 실제보다 크게 잡으면: 요청자가 IP를 위조해 rate limit을 우회할 수 있다.
 * - 실제보다 작게 잡으면: 모든 요청이 프록시 IP 하나로 집계되어 정상 사용자들이
 *   서로의 rate limit에 걸린다.
 */
export const TRUST_PROXY_HOPS = 2;
