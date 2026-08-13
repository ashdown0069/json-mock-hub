import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { COOKIE_KEYS } from '../../constant/cookies';

/**
 * JWT 서명 키가 없는 채로 전략이 만들어지는 것을 막는다.
 *
 * configService.get은 string | undefined를 돌려주는데, 그대로 secretOrKey에
 * 넘기면 서명 키가 undefined인 상태로 passport-jwt가 동작한다.
 * 기본값을 두는 것은 검증 키와 서명 키가 어긋나는 원인이 되므로 던진다.
 */
function requireJwtSecret(configService: ConfigService): string {
  const secret = configService.get<string>('JWT_ACCESS_SECRET');

  if (!secret) {
    throw new Error('JWT_ACCESS_SECRET이 설정되지 않았습니다.');
  }

  return secret;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          const data = request?.cookies[COOKIE_KEYS.ACCESS_TOKEN];

          if (!data) {
            return null;
          }
          return data;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: requireJwtSecret(configService),
    });
  }

  async validate(payload: any) {
    return { sub: payload.sub, email: payload.email };
  }
}
