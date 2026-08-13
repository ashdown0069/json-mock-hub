import { ForbiddenException } from '@nestjs/common';
import { CsrfHeaderGuard, CSRF_HEADER_VALUE } from './csrf-header.guard';

describe('CsrfHeaderGuard', () => {
  const createGuard = () => new CsrfHeaderGuard();

  const createContext = (
    method: string,
    headers: Record<string, string> = {},
    url = '/workspaces',
  ) =>
    ({
      getType: () => 'http',
      switchToHttp: () => ({ getRequest: () => ({ method, headers, url }) }),
      getHandler: () => undefined,
      getClass: () => undefined,
    }) as never;

  const withHeader = { 'x-requested-with': CSRF_HEADER_VALUE };

  it.each(['GET', 'HEAD', 'OPTIONS'])(
    '%s는 상태를 바꾸지 않으므로 헤더 없이 통과한다',
    (method) => {
      expect(createGuard().canActivate(createContext(method))).toBe(true);
    },
  );

  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])(
    '%s는 커스텀 헤더가 없으면 거부한다',
    (method) => {
      expect(() =>
        createGuard().canActivate(createContext(method)),
      ).toThrow(ForbiddenException);
    },
  );

  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])(
    '%s는 커스텀 헤더가 있으면 통과한다',
    (method) => {
      expect(
        createGuard().canActivate(createContext(method, withHeader)),
      ).toBe(true);
    },
  );

  it('헤더 값이 다르면 거부한다', () => {
    expect(() =>
      createGuard().canActivate(
        createContext('POST', { 'x-requested-with': 'fetch' }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('mock 서버(/api/**)는 외부 앱이 임의 클라이언트로 호출하므로 면제한다', () => {
    expect(
      createGuard().canActivate(createContext('POST', {}, '/api/shop/users')),
    ).toBe(true);
  });

  it('/apiary 같은 경로는 mock으로 오인하지 않는다', () => {
    expect(() =>
      createGuard().canActivate(createContext('POST', {}, '/apiary')),
    ).toThrow(ForbiddenException);
  });

  it('API 키 인증은 쿠키를 쓰지 않으므로 면제한다', () => {
    expect(
      createGuard().canActivate(
        createContext('POST', { 'x-api-key': 'mock_abc' }, '/ws1/filebrowser'),
      ),
    ).toBe(true);
  });

  it('거부 시 분기 가능한 에러 코드를 담는다', () => {
    try {
      createGuard().canActivate(createContext('POST'));
      throw new Error('여기에 도달하면 안 된다');
    } catch (error) {
      expect((error as ForbiddenException).getResponse()).toMatchObject({
        code: 'auth.csrf.header_required',
      });
    }
  });
});
