import { resolveCorsOptions } from './cors-options';

const DASHBOARD = 'http://localhost:4000';

describe('resolveCorsOptions', () => {
  it('mock 서버 경로(/api/**)는 모든 오리진을 허용한다', () => {
    const options = resolveCorsOptions('/api/shop/users', DASHBOARD);

    expect(options.origin).toBe('*');
    expect(options.methods).toEqual(
      expect.arrayContaining(['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']),
    );
  });

  it('mock 서버 경로에서는 credentials를 끈다 (origin:* 와 동시 사용 불가)', () => {
    expect(resolveCorsOptions('/api/shop/users', DASHBOARD).credentials).toBe(
      false,
    );
  });

  it('쿼리스트링이 붙어도 mock 경로로 인식한다', () => {
    expect(resolveCorsOptions('/api/users?page=1', DASHBOARD).origin).toBe('*');
  });

  it('경로가 정확히 /api여도 mock 경로로 인식한다', () => {
    expect(resolveCorsOptions('/api', DASHBOARD).origin).toBe('*');
  });

  it('대시보드 경로는 지정 오리진 + credentials를 사용한다', () => {
    const options = resolveCorsOptions('/workspaces/abc/filebrowser', DASHBOARD);

    expect(options.origin).toBe(DASHBOARD);
    expect(options.credentials).toBe(true);
  });

  it('/api로 시작만 하는 다른 경로(/apiary)는 mock으로 오인하지 않는다', () => {
    expect(resolveCorsOptions('/apiary', DASHBOARD).origin).toBe(DASHBOARD);
  });

  it('url이 undefined면 대시보드 정책으로 폴백한다', () => {
    expect(resolveCorsOptions(undefined, DASHBOARD).origin).toBe(DASHBOARD);
  });
});
