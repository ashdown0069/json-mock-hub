import { CookieOptions } from 'express';

/**
 * 인증 쿠키 옵션의 단일 출처.
 *
 * SameSite=None은 브라우저의 CSRF 기본 방어를 끄는데, 이 API에는 CSRF 토큰도
 * Origin 검증도 없다. Nest는 urlencoded 파서를 기본 활성화하므로 외부 사이트의
 * form POST가 프리플라이트 없이 도달한다(API 키 강제 재발급 등).
 * 따라서 기본값은 lax이며, 웹과 API가 서로 다른 사이트(eTLD+1)에 배포될 때만
 * CROSS_SITE_COOKIES=true로 none을 켠다.
 *
 * process.env를 호출 시점에 읽는다 — ConfigModule이 .env를 적재하는 시점이
 * 모듈 로드보다 늦기 때문이다.
 */
export function authCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    // __Host- 접두사는 Secure 필수(없으면 브라우저가 쿠키를 폐기)이고,
    // SameSite=None도 Secure를 요구한다. localhost는 http에서도 Secure 쿠키를
    // 허용하므로 개발/배포 동일하게 항상 true로 둔다.
    secure: true,
    sameSite: process.env.CROSS_SITE_COOKIES === 'true' ? 'none' : 'lax',
    path: '/',
  };
}
