import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { COOKIE_KEYS } from '../../constant/cookies';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          const data = request?.cookies[COOKIE_KEYS.REFRESH_TOKEN];
          if (!data) {
            return null;
          }
          return data;
        },
      ]),
      ignoreExpiration: false,
      // fallback을 두면 서명 측(auth.service)과 키가 비대칭이 되어도 앱이 기동한다.
      // 필수 여부는 validateEnv가 부팅 시 보장하며, 여기서도 getOrThrow로 이중 확인한다.
      secretOrKey: configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
    });
  }

  async validate(payload: any) {
    return { sub: payload.sub, email: payload.email };
  }
}
