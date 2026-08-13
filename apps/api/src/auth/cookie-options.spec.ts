import { authCookieOptions } from './cookie-options';

describe('authCookieOptions', () => {
  const originalValue = process.env.CROSS_SITE_COOKIES;

  afterEach(() => {
    if (originalValue === undefined) {
      delete process.env.CROSS_SITE_COOKIES;
    } else {
      process.env.CROSS_SITE_COOKIES = originalValue;
    }
  });

  it('기본값은 sameSite=lax — 브라우저의 CSRF 기본 방어를 유지한다', () => {
    delete process.env.CROSS_SITE_COOKIES;

    expect(authCookieOptions().sameSite).toBe('lax');
  });

  it('CROSS_SITE_COOKIES=true일 때만 sameSite=none으로 전환한다', () => {
    process.env.CROSS_SITE_COOKIES = 'true';

    expect(authCookieOptions().sameSite).toBe('none');
  });

  it('true 이외의 값은 lax로 취급한다', () => {
    process.env.CROSS_SITE_COOKIES = 'yes';

    expect(authCookieOptions().sameSite).toBe('lax');
  });

  it('httpOnly와 secure는 항상 켜져 있다 (__Host- 접두사 요구사항)', () => {
    const options = authCookieOptions();

    expect(options.httpOnly).toBe(true);
    expect(options.secure).toBe(true);
    expect(options.path).toBe('/');
  });

  it('호출 시점에 환경변수를 읽는다 (모듈 로드 시점 고정 금지)', () => {
    delete process.env.CROSS_SITE_COOKIES;
    expect(authCookieOptions().sameSite).toBe('lax');

    process.env.CROSS_SITE_COOKIES = 'true';
    expect(authCookieOptions().sameSite).toBe('none');
  });
});
