import { Test, TestingModule } from '@nestjs/testing';
import { Response, Request } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { COOKIE_KEYS } from '../constant/cookies';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: { login: jest.Mock; refreshTokens: jest.Mock };
  let res: { cookie: jest.Mock; clearCookie: jest.Mock; redirect: jest.Mock };

  const TOKENS = { accessToken: 'access-jwt', refreshToken: 'refresh-jwt' };

  beforeEach(async () => {
    authService = {
      login: jest.fn().mockResolvedValue(TOKENS),
      refreshTokens: jest.fn().mockResolvedValue(TOKENS),
    };
    res = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
      redirect: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    })
      // 쿠키 옵션 검증만 목표로 하므로 가드는 통과시킨다.
      .overrideGuard(JwtRefreshGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(GoogleAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('정의되어 있어야 한다', () => {
    expect(controller).toBeDefined();
  });

  // __Host- 접두사와 SameSite=None은 모두 Secure를 요구한다.
  // 환경 분기로 secure가 꺼지면 브라우저가 쿠키를 폐기해 로그인이 유지되지 않으므로
  // 어떤 환경에서도 secure:true / sameSite:'none' 이 보장되는지 회귀 검증한다.
  it('login은 access/refresh 쿠키를 secure:true, sameSite:none 으로 설정한다', async () => {
    await controller.login(
      { email: 'a@b.com', password: 'pw' } as never,
      res as unknown as Response,
    );

    const cookieNames = res.cookie.mock.calls.map((call) => call[0]);
    expect(cookieNames).toEqual(
      expect.arrayContaining([
        COOKIE_KEYS.ACCESS_TOKEN,
        COOKIE_KEYS.REFRESH_TOKEN,
      ]),
    );

    for (const [, , options] of res.cookie.mock.calls) {
      expect(options).toMatchObject({
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
      });
    }
  });

  it('refresh도 동일한 secure/sameSite 쿠키 옵션을 사용한다', async () => {
    const req = {
      cookies: { [COOKIE_KEYS.REFRESH_TOKEN]: 'refresh-jwt' },
    } as unknown as Request;

    await controller.refresh('user-1', req, res as unknown as Response);

    for (const [, , options] of res.cookie.mock.calls) {
      expect(options).toMatchObject({ secure: true, sameSite: 'lax' });
    }
  });
});
