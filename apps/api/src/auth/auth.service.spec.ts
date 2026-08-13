import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

// bcrypt는 목으로 대체하지 않는다. 토큰 회전 테스트가 "저장된 해시가
// 방금 발급한 토큰의 것인지"를 실제로 대조해야 하기 때문이다.
describe('AuthService', () => {
  let usersService: {
    findByEmail: jest.Mock;
    findById: jest.Mock;
    create: jest.Mock;
    updateRefreshToken: jest.Mock;
    updateProvider: jest.Mock;
  };
  let jwtService: { signAsync: jest.Mock };
  let configService: { get: jest.Mock };
  let service: AuthService;

  beforeEach(() => {
    usersService = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      updateRefreshToken: jest.fn().mockResolvedValue(undefined),
      updateProvider: jest.fn(),
    };
    // Promise.all의 배열은 왼쪽부터 평가되므로 1회차가 access, 2회차가 refresh다.
    jwtService = {
      signAsync: jest
        .fn()
        .mockResolvedValueOnce('access-1')
        .mockResolvedValueOnce('refresh-1'),
    };
    configService = { get: jest.fn().mockReturnValue('test-value') };

    service = new AuthService(
      usersService as never,
      jwtService as never,
      configService as never,
    );
  });

  const userDoc = (over: Record<string, unknown> = {}) => ({
    _id: { toString: () => 'u1' },
    email: 'a@b.com',
    nickname: 'nick',
    password: null,
    dbRefreshToken: null,
    provider: undefined,
    providerId: undefined,
    ...over,
  });

  describe('signup', () => {
    it('이미 가입된 이메일이면 auth.signup.email_exists로 거부한다', async () => {
      usersService.findByEmail.mockResolvedValue(userDoc());

      await expect(
        service.signup({ email: 'a@b.com', password: 'pw1234' } as never),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(usersService.create).not.toHaveBeenCalled();
    });

    it('비밀번호를 평문이 아닌 bcrypt 해시로 저장한다', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue(userDoc());

      await service.signup({
        email: 'a@b.com',
        password: 'pw1234',
      } as never);

      const [payload] = usersService.create.mock.calls[0];
      expect(payload.password).not.toBe('pw1234');
      await expect(bcrypt.compare('pw1234', payload.password)).resolves.toBe(
        true,
      );
    });
  });

  describe('login', () => {
    it('미가입 이메일과 비밀번호 불일치를 같은 코드·메시지로 응답한다', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      const notFound = await service
        .login({ email: 'a@b.com', password: 'pw' } as never)
        .catch((e: UnauthorizedException) => e.getResponse());

      const hashed = await bcrypt.hash('correct-pw', 10);
      usersService.findByEmail.mockResolvedValue(
        userDoc({ password: hashed }),
      );
      const wrongPw = await service
        .login({ email: 'a@b.com', password: 'wrong-pw' } as never)
        .catch((e: UnauthorizedException) => e.getResponse());

      // 두 응답이 다르면 응답만 보고 가입된 이메일을 골라낼 수 있다
      expect(notFound).toEqual(wrongPw);
      expect(notFound).toMatchObject({
        code: 'auth.login.invalid_credentials',
      });
    });

    it('비밀번호가 없는 OAuth 전용 계정은 비밀번호 로그인을 거부한다', async () => {
      usersService.findByEmail.mockResolvedValue(userDoc({ password: null }));

      await expect(
        service.login({ email: 'a@b.com', password: 'pw' } as never),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('로그인에 성공하면 응답한 refresh 토큰의 해시를 저장한다', async () => {
      const hashed = await bcrypt.hash('correct-pw', 10);
      usersService.findByEmail.mockResolvedValue(
        userDoc({ password: hashed }),
      );

      const tokens = await service.login({
        email: 'a@b.com',
        password: 'correct-pw',
      } as never);

      expect(tokens).toEqual({
        accessToken: 'access-1',
        refreshToken: 'refresh-1',
      });

      const [userId, storedHash] = usersService.updateRefreshToken.mock.calls[0];
      expect(userId).toBe('u1');
      expect(storedHash).not.toBe('refresh-1');
      await expect(bcrypt.compare('refresh-1', storedHash)).resolves.toBe(true);
    });
  });

  describe('refreshTokens', () => {
    it('로그아웃된 세션(dbRefreshToken이 비어 있음)은 거부한다', async () => {
      usersService.findById.mockResolvedValue(
        userDoc({ dbRefreshToken: null }),
      );

      await expect(service.refreshTokens('u1', 'anything')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('저장된 해시와 일치하지 않는 토큰은 거부한다', async () => {
      usersService.findById.mockResolvedValue(
        userDoc({ dbRefreshToken: await bcrypt.hash('old-refresh', 10) }),
      );

      await expect(
        service.refreshTokens('u1', 'stolen-refresh'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('회전 후 저장되는 해시는 직전 토큰이 아니라 새로 발급한 토큰의 것이다', async () => {
      // 이 테스트가 generateTokens ↔ updateRefreshToken 순서 역전을 잡는다.
      // 순서가 바뀌면 직전 토큰의 해시가 남아 갱신이 1회 만에 깨진다.
      const oldPlain = 'old-refresh';
      usersService.findById.mockResolvedValue(
        userDoc({ dbRefreshToken: await bcrypt.hash(oldPlain, 10) }),
      );

      const tokens = await service.refreshTokens('u1', oldPlain);

      expect(tokens.refreshToken).toBe('refresh-1');

      const [, storedHash] = usersService.updateRefreshToken.mock.calls[0];
      await expect(bcrypt.compare('refresh-1', storedHash)).resolves.toBe(true);
      await expect(bcrypt.compare(oldPlain, storedHash)).resolves.toBe(false);
    });
  });

  describe('logout', () => {
    it('refresh 토큰을 null로 지워 세션을 종료한다', async () => {
      await service.logout('u1');

      expect(usersService.updateRefreshToken).toHaveBeenCalledWith('u1', null);
    });
  });

  describe('validateOAuthLogin', () => {
    it('provider 정보가 그대로면 불필요한 쓰기를 하지 않는다', async () => {
      usersService.findByEmail.mockResolvedValue(
        userDoc({ provider: 'google', providerId: 'g1' }),
      );

      await service.validateOAuthLogin('a@b.com', 'nick', 'g1', 'google');

      expect(usersService.updateProvider).not.toHaveBeenCalled();
      expect(usersService.create).not.toHaveBeenCalled();
    });

    it('같은 이메일의 기존 계정에 provider를 붙이고 새 계정을 만들지 않는다', async () => {
      usersService.findByEmail.mockResolvedValue(userDoc());
      usersService.updateProvider.mockResolvedValue(
        userDoc({ provider: 'google', providerId: 'g1' }),
      );

      await service.validateOAuthLogin('a@b.com', 'nick', 'g1', 'google');

      expect(usersService.create).not.toHaveBeenCalled();
      expect(usersService.updateProvider).toHaveBeenCalledWith(
        'u1',
        'google',
        'g1',
      );
    });

    it('신규 OAuth 계정은 password를 null로 만든다', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue(userDoc());
      usersService.updateProvider.mockResolvedValue(userDoc());

      await service.validateOAuthLogin('a@b.com', 'nick', 'g1', 'google');

      expect(usersService.create).toHaveBeenCalledWith({
        email: 'a@b.com',
        nickname: 'nick',
        password: null,
      });
    });

    it('nickname이 비어 오면 이메일 로컬파트를 표시명으로 쓴다', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue(userDoc());
      usersService.updateProvider.mockResolvedValue(userDoc());

      await service.validateOAuthLogin('someone@b.com', '', 'g1', 'google');

      const [payload] = usersService.create.mock.calls[0];
      expect(payload.nickname).toBe('someone');
    });
  });
});
