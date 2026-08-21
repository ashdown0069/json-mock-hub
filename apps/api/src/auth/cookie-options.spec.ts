import { authCookieOptions } from './cookie-options';

describe('authCookieOptions', () => {
  const originalCrossSite = process.env.CROSS_SITE_COOKIES;
  const originalDomain = process.env.COOKIE_DOMAIN;

  afterEach(() => {
    if (originalCrossSite === undefined) {
      delete process.env.CROSS_SITE_COOKIES;
    } else {
      process.env.CROSS_SITE_COOKIES = originalCrossSite;
    }

    if (originalDomain === undefined) {
      delete process.env.COOKIE_DOMAIN;
    } else {
      process.env.COOKIE_DOMAIN = originalDomain;
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

  it('httpOnly와 secure는 항상 켜져 있다', () => {
    const options = authCookieOptions();

    expect(options.httpOnly).toBe(true);
    expect(options.secure).toBe(true);
    expect(options.path).toBe('/');
  });

  it('COOKIE_DOMAIN이 설정되지 않았을 때는 domain 속성이 없다 (로컬 개발)', () => {
    delete process.env.COOKIE_DOMAIN;

    expect(authCookieOptions().domain).toBeUndefined();
  });

  it('COOKIE_DOMAIN이 설정되어 있을 때 domain 속성을 반영한다 (배포 환경)', () => {
    process.env.COOKIE_DOMAIN = '.myrealm.cloud';

    expect(authCookieOptions().domain).toBe('.myrealm.cloud');
  });

  it('호출 시점에 환경변수를 읽는다 (모듈 로드 시점 고정 금지)', () => {
    delete process.env.CROSS_SITE_COOKIES;
    delete process.env.COOKIE_DOMAIN;
    expect(authCookieOptions().sameSite).toBe('lax');
    expect(authCookieOptions().domain).toBeUndefined();

    process.env.CROSS_SITE_COOKIES = 'true';
    process.env.COOKIE_DOMAIN = '.myrealm.cloud';
    expect(authCookieOptions().sameSite).toBe('none');
    expect(authCookieOptions().domain).toBe('.myrealm.cloud');
  });
});
