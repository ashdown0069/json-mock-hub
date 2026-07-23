import { COOKIE_KEYS } from './cookies';

describe('COOKIE_KEYS', () => {
  it('환경과 무관하게 __Host- 접두사 단일 이름을 사용한다', () => {
    expect(COOKIE_KEYS.ACCESS_TOKEN).toBe('__Host-access-token');
    expect(COOKIE_KEYS.REFRESH_TOKEN).toBe('__Host-refresh-token');
  });
});
