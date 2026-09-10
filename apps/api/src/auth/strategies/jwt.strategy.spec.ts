import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy.validate', () => {
  const strategy = new JwtStrategy({
    get: jest.fn().mockReturnValue('test-secret'),
  } as unknown as ConfigService);

  it('검증된 JWT의 exp를 principal에 보존한다', async () => {
    await expect(strategy.validate({
      sub: 'user-1',
      email: 'a@example.test',
      exp: 2_000_000_000,
    })).resolves.toEqual({
      sub: 'user-1',
      email: 'a@example.test',
      exp: 2_000_000_000,
    });
  });

  it.each([undefined, NaN, Infinity, '2000000000', 0, -1, 1.5])(
    '유효하지 않은 exp를 거부한다: %p',
    async (exp) => {
      await expect(strategy.validate({
        sub: 'user-1',
        email: 'a@example.test',
        exp,
      })).rejects.toBeInstanceOf(UnauthorizedException);
    },
  );
});
