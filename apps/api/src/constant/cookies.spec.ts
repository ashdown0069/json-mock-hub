import { COOKIE_KEYS } from './cookies';

describe('COOKIE_KEYS', () => {
  it('서브도메인 쿠키 공유가 가능한 표준 단일 이름을 사용한다', () => {
    expect(COOKIE_KEYS.ACCESS_TOKEN).toBe('access-token');
    expect(COOKIE_KEYS.REFRESH_TOKEN).toBe('refresh-token');
  });
});
